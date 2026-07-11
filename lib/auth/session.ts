import "server-only";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "justgo_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secretKey() {
  const secret = process.env.APP_JWT_SECRET;
  if (!secret) throw new Error("APP_JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function createSessionCookie(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

/**
 * Id of the currently authenticated user. Should only be called behind the proxy (already-protected routes).
 * Memoized per request with `cache()`: it's invoked several times per page/action
 * and it's not worth re-reading and re-verifying the cookie every time.
 */
export const getCurrentUserId = cache(async (): Promise<string> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) throw new Error("No active session");
  const { payload } = await jwtVerify(token, secretKey());
  if (typeof payload.sub !== "string") throw new Error("Invalid session");
  return payload.sub;
});

/** Like getCurrentUserId(), but for places like the root layout that also
 * render /login and /signup, where there may be no session. */
export async function getCurrentUserIdOrNull(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Avoids open redirects: only allows internal routes (starting with "/"). */
export function safeNextPath(next: string): string {
  return next.startsWith("/") ? next : "/";
}

export { SESSION_COOKIE };
