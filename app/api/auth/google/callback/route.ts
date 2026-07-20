import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getGoogleClient, getGoogleProfile, type GoogleProfile } from "@/lib/auth/google";
import {
  generateUniqueUsernameFromEmail,
  invalidateLocaleAcrossApp,
  seedDefaultCategories,
  seedDefaultFinanceCategories,
  syncLocalePreferenceOnLogin,
} from "@/lib/actions/auth";
import { createSessionCookie, safeNextPath } from "@/lib/auth/session";
import { resolvePreAuthLocale } from "@/lib/i18n/locale";
import {
  GOOGLE_OAUTH_COOKIE,
  googleCallbackURI,
  type GoogleOAuthCookiePayload,
} from "@/lib/auth/google-oauth-cookie";

function loginErrorRedirect(request: Request, next: string): string {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", next);
  url.searchParams.set("error", "googleAuthFailed");
  return url.toString();
}

/** Name/photo are refreshed on every login (not just set once at signup),
 * so a change on the Google account side — a new photo, a legal name
 * change — shows up here too instead of freezing whatever was true the
 * first time. Shared by both "already linked" branches below. */
function profileFields(profile: GoogleProfile) {
  return { name: profile.name, avatarUrl: profile.avatarUrl };
}

async function findOrCreateGoogleUser(profile: GoogleProfile): Promise<string> {
  const [byGoogleId] = await db.select().from(users).where(eq(users.googleId, profile.googleId)).limit(1);
  if (byGoogleId) {
    await db.update(users).set(profileFields(profile)).where(eq(users.id, byGoogleId.id));
    await syncLocalePreferenceOnLogin(byGoogleId.id);
    return byGoogleId.id;
  }

  const [byEmail] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);
  if (byEmail) {
    if (!profile.emailVerified) {
      // Refuse to auto-link an unverified Google email to an existing
      // account: Google can issue an id_token with email_verified=false,
      // and trusting it here would let anyone with such an account take
      // over whichever existing account happens to share that address.
      throw new Error("Google account email is not verified; refusing to link");
    }
    await db
      .update(users)
      .set({ googleId: profile.googleId, ...profileFields(profile) })
      .where(eq(users.id, byEmail.id));
    await syncLocalePreferenceOnLogin(byEmail.id);
    return byEmail.id;
  }

  const userId = nanoid();
  const username = await generateUniqueUsernameFromEmail(profile.email);
  const localePreference = await resolvePreAuthLocale();
  await db.insert(users).values({
    id: userId,
    username,
    email: profile.email,
    googleId: profile.googleId,
    localePreference,
    ...profileFields(profile),
  });
  await seedDefaultCategories(userId);
  await seedDefaultFinanceCategories(userId);
  return userId;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const rawCookie = store.get(GOOGLE_OAUTH_COOKIE)?.value;
  store.delete(GOOGLE_OAUTH_COOKIE);

  let payload: GoogleOAuthCookiePayload | null = null;
  try {
    payload = rawCookie ? (JSON.parse(rawCookie) as GoogleOAuthCookiePayload) : null;
  } catch {
    payload = null;
  }

  const next = safeNextPath(payload?.next ?? "/");

  if (!code || !state || !payload || state !== payload.state) {
    redirect(loginErrorRedirect(request, next));
  }

  try {
    const tokens = await getGoogleClient(googleCallbackURI(url)).validateAuthorizationCode(
      code,
      payload.codeVerifier
    );
    const profile = getGoogleProfile(tokens.idToken());
    const userId = await findOrCreateGoogleUser(profile);
    await createSessionCookie(userId);
    await invalidateLocaleAcrossApp();
  } catch {
    redirect(loginErrorRedirect(request, next));
  }

  redirect(next);
}
