import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { generateCodeVerifier, generateState } from "arctic";
import { getGoogleClient } from "@/lib/auth/google";
import { safeNextPath } from "@/lib/auth/session";
import { GOOGLE_OAUTH_COOKIE, GOOGLE_OAUTH_COOKIE_MAX_AGE, googleCallbackURI } from "@/lib/auth/google-oauth-cookie";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next") ?? "/");

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const authorizationURL = getGoogleClient(googleCallbackURI(url)).createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);

  const store = await cookies();
  store.set(GOOGLE_OAUTH_COOKIE, JSON.stringify({ state, codeVerifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE,
  });

  redirect(authorizationURL.toString());
}
