import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "justgo_session";
// /api/cron/reminders no tiene sesión de usuario (lo llama un cron externo,
// ver .github/workflows/push-reminders.yml) — se autentica con su propio
// secreto compartido (CRON_SECRET) dentro del route handler, no con cookie.
const PUBLIC_PATHS = ["/login", "/signup", "/bienvenida", "/manifest.webmanifest", "/api/auth/google", "/api/cron/reminders"];

function secretKey() {
  return new TextEncoder().encode(process.env.APP_JWT_SECRET ?? "");
}

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authenticated = await hasValidSession(request);

  if (!authenticated) {
    // La raíz no tiene su propia página pública: un visitante sin sesión
    // que pide "/" va a la landing (/bienvenida) en vez de directo al
    // formulario de login, sin tocar la ruta del dashboard.
    const destination = pathname === "/" ? "/bienvenida" : "/login";
    const redirectUrl = new URL(destination, request.url);
    if (destination === "/login") redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest).*)",
  ],
};
