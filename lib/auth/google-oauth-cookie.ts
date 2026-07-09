export const GOOGLE_OAUTH_COOKIE = "google_oauth";
export const GOOGLE_OAUTH_COOKIE_MAX_AGE = 60 * 10; // 10 minutos

export type GoogleOAuthCookiePayload = {
  state: string;
  codeVerifier: string;
  next: string;
};

export function googleCallbackURI(url: URL): string {
  return new URL("/api/auth/google/callback", url).toString();
}
