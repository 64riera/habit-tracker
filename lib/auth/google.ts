import "server-only";
import { Google, decodeIdToken } from "arctic";

/** Single source of truth for "is Google OAuth configured?" — when it is,
 * manual login/signup with username and password is disabled entirely
 * (see lib/actions/auth.ts and the login/signup forms), so as not to leave
 * two entry doors open at the same time. */
export function isGoogleAuthEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleClient(redirectURI: string): Google {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not configured");
  }
  return new Google(clientId, clientSecret, redirectURI);
}

export type GoogleProfile = {
  googleId: string;
  email: string;
  /** Google's own attestation that `email` was verified — must be checked
   * before trusting `email` to link/take over an existing account (see
   * findOrCreateGoogleUser in the OAuth callback route). Google can issue
   * an id_token with `email_verified: false` (e.g. an unverified Workspace
   * domain), and it's a documented requirement of OIDC relying parties to
   * check this claim rather than trust the email address blindly. */
  emailVerified: boolean;
  /** `null`, not omitted, when Google didn't return one — callers persist
   * this straight to the (nullable) users.name/avatar_url columns, so the
   * shape always has both keys instead of leaving stale data untouched by
   * accident on a re-login. */
  name: string | null;
  avatarUrl: string | null;
};

type GoogleIdTokenClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

// The avatar is only ever rendered at 56px (see profile-header.tsx) — 112px
// covers that at 2x for retina. Google's own claim comes with whatever
// default size it picked (commonly 96px, sometimes the full original), so
// left alone every login would keep re-downloading a bigger image than the
// page ever displays. `lh3.googleusercontent.com` URLs take a `=s<n>-c`
// suffix that asks Google's own CDN to serve a resized/cropped version
// directly — cheaper than fetching the original and letting the browser
// scale it down. Replaces an existing size suffix if present, appends one
// otherwise; leaves non-Google-CDN URLs untouched.
const AVATAR_DISPLAY_SIZE = 112;

export function resizeGoogleAvatarUrl(url: string, size: number = AVATAR_DISPLAY_SIZE): string {
  if (!url.includes("googleusercontent.com")) return url;
  if (/=s\d+(-c)?$/.test(url)) return url.replace(/=s\d+(-c)?$/, `=s${size}-c`);
  return `${url}=s${size}-c`;
}

/** Extracts the profile from the id_token (OpenID Connect claims), with no
 * extra call to the userinfo endpoint — `name`/`picture` are included
 * because the authorization request asks for the "profile" scope (see
 * app/api/auth/google/route.ts) alongside "openid"/"email". */
export function getGoogleProfile(idToken: string): GoogleProfile {
  const claims = decodeIdToken(idToken) as GoogleIdTokenClaims;
  if (!claims.email) {
    throw new Error("Google didn't return an email for this account");
  }
  return {
    googleId: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified === true,
    name: claims.name ?? null,
    avatarUrl: claims.picture ? resizeGoogleAvatarUrl(claims.picture) : null,
  };
}
