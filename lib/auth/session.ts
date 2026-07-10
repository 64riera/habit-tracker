import "server-only";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "justgo_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

function secretKey() {
  const secret = process.env.APP_JWT_SECRET;
  if (!secret) throw new Error("APP_JWT_SECRET no está configurado");
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
 * Id del usuario autenticado actual. Solo debe llamarse detras del proxy (rutas ya protegidas).
 * Memoizado por request con `cache()`: se invoca varias veces por página/acción
 * y no vale la pena releer y re-verificar la cookie cada vez.
 */
export const getCurrentUserId = cache(async (): Promise<string> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) throw new Error("No hay sesión activa");
  const { payload } = await jwtVerify(token, secretKey());
  if (typeof payload.sub !== "string") throw new Error("Sesión inválida");
  return payload.sub;
});

/** Como getCurrentUserId(), pero para lugares como el layout raiz que tambien
 * renderizan /login y /signup, donde puede no haber sesion. */
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

/** Evita open redirects: solo permite rutas internas (empiezan con "/"). */
export function safeNextPath(next: string): string {
  return next.startsWith("/") ? next : "/";
}

export { SESSION_COOKIE };
