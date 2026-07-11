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
};

type GoogleIdTokenClaims = {
  sub: string;
  email?: string;
};

/** Extracts the profile from the id_token (OpenID Connect claims), with no extra call to the userinfo endpoint. */
export function getGoogleProfile(idToken: string): GoogleProfile {
  const claims = decodeIdToken(idToken) as GoogleIdTokenClaims;
  if (!claims.email) {
    throw new Error("Google didn't return an email for this account");
  }
  return { googleId: claims.sub, email: claims.email };
}
