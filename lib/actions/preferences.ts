"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";
import { isLocale } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentUserId, getCurrentUserIdOrNull } from "@/lib/auth/session";
import type { ThemePreference } from "@/lib/queries/user";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Before having a session (selector in login/signup) the choice is saved
 * as a bridge cookie. With a session (selector in Settings) it's saved
 * directly on the account, same as `setThemePreference`. */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const userId = await getCurrentUserIdOrNull();
  if (userId) {
    await db.update(users).set({ localePreference: locale }).where(eq(users.id, userId));
    return;
  }
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR_SECONDS });
}

export async function setDayCutoffHour(hour: number) {
  const store = await cookies();
  store.set("justgo_day_cutoff", String(hour), { path: "/", maxAge: YEAR_SECONDS });
}

/** Saves the theme preference on the account, so it follows the user across devices. */
export async function setThemePreference(theme: string) {
  if (theme !== "light" && theme !== "dark" && theme !== "system") return;
  const userId = await getCurrentUserId();
  await db
    .update(users)
    .set({ themePreference: theme satisfies ThemePreference })
    .where(eq(users.id, userId));
}

/** Saves the currency used to display every amount in the Finance section. */
export async function setCurrencyPreference(currency: string) {
  if (currency !== "MXN" && currency !== "USD") return;
  const userId = await getCurrentUserId();
  await db.update(users).set({ currencyPreference: currency }).where(eq(users.id, userId));
}

/** Saves the IANA timezone detected in the browser (see
 * `timezone-sync.tsx`) — needed to know which UTC time a reminder's local
 * time corresponds to, see `app/api/cron/reminders/route.ts`. */
export async function setTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    return;
  }
  const userId = await getCurrentUserId();
  await db.update(users).set({ timezone }).where(eq(users.id, userId));
}

/** Marks that the install suggestion modal was already shown and they
 * decided something (install or not) — doesn't matter which, just that
 * there's no need to ask again. See install-suggestion-modal.tsx. */
export async function setInstallPromptSeen() {
  const userId = await getCurrentUserId();
  await db.update(users).set({ installPromptSeen: true }).where(eq(users.id, userId));
}
