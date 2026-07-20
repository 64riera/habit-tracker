"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { categories, financeCategories, users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, safeNextPath } from "@/lib/auth/session";
import { getPreAuthLocaleCookie, resolvePreAuthLocale } from "@/lib/i18n/locale";
import { isGoogleAuthEnabled } from "@/lib/auth/google";
import { CANONICAL_CATEGORIES } from "@/lib/habits/canonical-categories";
import { CANONICAL_FINANCE_CATEGORIES } from "@/lib/finance/canonical-categories";
import { clearLoginAttempts, isLoginRateLimited, recordFailedLoginAttempt } from "@/lib/auth/login-rate-limit";

// Same shape as a real stored hash (see hashPassword: 16-byte salt, 64-byte
// key, both hex) so verifyPassword takes its normal, scrypt-dominated time
// even when the username doesn't exist — without this, "no such user" (an
// immediate return) is measurably faster than "wrong password" (a scrypt
// derivation), letting an attacker enumerate valid usernames by timing.
const DUMMY_PASSWORD_HASH = `${"0".repeat(32)}:${"0".repeat(128)}`;

/** `redirectTo` instead of next/navigation's `redirect()`: login/signup
 * change which account is active, and with it the language that should be
 * displayed (account preference instead of what's detected from the
 * device). The root layout — where `I18nProvider` lives — is shared across
 * the whole app, so a *soft* navigation from the Next router can reuse that
 * part of the tree exactly as it was before signing in. Returning the
 * destination URL and letting the form do `window.location.href` forces a
 * real document reload, without depending on the router deciding to
 * refresh the shared layout. */
export type AuthState = { error?: string; redirectTo?: string };

const USERNAME_PATTERN = /^[a-z0-9_.-]+$/;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function seedDefaultCategories(userId: string): Promise<void> {
  await db.insert(categories).values(
    CANONICAL_CATEGORIES.map((c, i) => ({
      id: nanoid(),
      userId,
      nameEs: c.nameEs,
      nameEn: c.nameEn,
      color: c.color,
      icon: c.icon,
      sortOrder: i,
    }))
  );
}

export async function seedDefaultFinanceCategories(userId: string): Promise<void> {
  await db.insert(financeCategories).values(
    CANONICAL_FINANCE_CATEGORIES.map((c, i) => ({
      id: nanoid(),
      userId,
      nameEs: c.nameEs,
      nameEn: c.nameEn,
      color: c.color,
      icon: c.icon,
      sortOrder: i,
    }))
  );
}

/** Syncs the explicit choice made in the pre-auth selector (login/signup) to
 * the account that just authenticated. Only acts if the user actually
 * touched the selector during this visit (cookie present) — otherwise, the
 * preference already saved on the account is respected instead of
 * overwriting it with a device detection that might not reflect it (e.g.
 * logging in from a browser configured with a different language). */
export async function syncLocalePreferenceOnLogin(userId: string): Promise<void> {
  const explicit = await getPreAuthLocaleCookie();
  if (explicit) {
    await db.update(users).set({ localePreference: explicit }).where(eq(users.id, userId));
  }
}

/** The root layout (where `I18nProvider` lives) is shared across all
 * routes, so the client router reuses it between soft navigations instead
 * of requesting it again — without this, the language brought by a
 * freshly created/closed session could take a while to show up because
 * the client kept using the locale computed on the previous load.
 * `revalidatePath("/", "layout")` purges that cache entirely, so the
 * navigation that follows login/signup/logout always brings the fresh
 * locale (account if there's a session, device otherwise — see
 * getCurrentLocale). */
export async function invalidateLocaleAcrossApp(): Promise<void> {
  revalidatePath("/", "layout");
}

/** Derives an available username from an email (accounts created via Google, with no manually chosen username). */
export async function generateUniqueUsernameFromEmail(email: string): Promise<string> {
  const base = normalizeUsername(email.split("@")[0] ?? "")
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
  const padded = base.length < USERNAME_MIN_LENGTH ? `user${base}` : base;

  for (let attempt = 0; ; attempt++) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const candidate = `${padded.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
}

export async function signup(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  // Defense in depth: the form already hides these fields when Google is
  // configured, but the Server Action must also reject a direct POST
  // (curl, devtools) instead of relying solely on the UI.
  if (isGoogleAuthEnabled()) {
    return { error: "manualAuthDisabled" };
  }

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (username.length < 3 || username.length > 30 || !USERNAME_PATTERN.test(username)) {
    return { error: "usernameInvalid" };
  }
  if (password.length < 8) {
    return { error: "passwordTooShort" };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing) {
    return { error: "usernameTaken" };
  }

  const userId = nanoid();
  const passwordHash = await hashPassword(password);
  const localePreference = await resolvePreAuthLocale();
  await db.insert(users).values({ id: userId, username, passwordHash, localePreference });
  await seedDefaultCategories(userId);
  await seedDefaultFinanceCategories(userId);

  await createSessionCookie(userId);
  await invalidateLocaleAcrossApp();
  return { redirectTo: safeNextPath(next) };
}

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  // See the equivalent comment in signup().
  if (isGoogleAuthEnabled()) {
    return { error: "manualAuthDisabled" };
  }

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (isLoginRateLimited(username)) {
    return { error: "tooManyAttempts" };
  }

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const passwordValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !user.passwordHash || !passwordValid) {
    recordFailedLoginAttempt(username);
    return { error: "invalidCredentials" };
  }
  clearLoginAttempts(username);

  await syncLocalePreferenceOnLogin(user.id);
  await createSessionCookie(user.id);
  await invalidateLocaleAcrossApp();
  return { redirectTo: safeNextPath(next) };
}

// Logging out is NOT a Server Action (see app/api/auth/logout/route.ts):
// Next always re-requests the current screen after any Server Action, and
// that screen (Settings) just lost the session its own data assumes.
// A plain POST to a Route Handler avoids that automatic refresh — the
// browser just follows the redirect.
