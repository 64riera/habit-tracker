import "server-only";
import { Google, decodeIdToken } from "arctic";

export function getGoogleClient(redirectURI: string): Google {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET no están configurados");
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

/** Extrae el perfil del id_token (claims OpenID Connect), sin llamada adicional al userinfo endpoint. */
export function getGoogleProfile(idToken: string): GoogleProfile {
  const claims = decodeIdToken(idToken) as GoogleIdTokenClaims;
  if (!claims.email) {
    throw new Error("Google no devolvió un email para esta cuenta");
  }
  return { googleId: claims.sub, email: claims.email };
}
