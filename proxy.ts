import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { APP_CANONICAL_HOST } from "@/lib/branding";

const SESSION_COOKIE = "justgo_session";
// /api/cron/reminders no tiene sesión de usuario (lo llama un cron externo,
// ver .github/workflows/push-reminders.yml) — se autentica con su propio
// secreto compartido (CRON_SECRET) dentro del route handler, no con cookie.
const PUBLIC_PATHS = ["/login", "/signup", "/welcome", "/manifest.webmanifest", "/api/auth/google", "/api/cron/reminders"];

// Dominio viejo (antes del rebrand a "Just Go"): redirige de forma
// permanente en vez de servir la app ahí, para no romper accesos directos
// ni la PWA ya instalada de quien tenía habits.srivera.xyz.
const LEGACY_HOSTS = new Set(["habits.srivera.xyz", "www.habits.srivera.xyz"]);

// Rutas viejas en español (antes de que todo el código base pasara a
// inglés): redirige a la ruta nueva en vez de 404, para no romper
// bookmarks ni accesos directos ya instalados. Orden importa — los
// prefijos más específicos van primero, si no "/habitos/rutinas" caería
// en la regla genérica de "/habitos" antes de llegar a la suya.
const LEGACY_PATH_REWRITES: [RegExp, string][] = [
  [/^\/habitos\/rutinas/, "/habits/routines"],
  [/^\/habitos\/categorias/, "/habits/categories"],
  [/^\/habitos\/logros/, "/habits/achievements"],
  [/^\/habitos\/nuevo/, "/habits/new"],
  [/^\/enfoque\/historial/, "/focus/history"],
  [/^\/enfoque\/estadisticas/, "/focus/stats"],
  [/^\/enfoque\/bosque/, "/focus/forest"],
  [/^\/habitos/, "/habits"],
  [/^\/enfoque/, "/focus"],
  [/^\/historial/, "/history"],
  [/^\/estadisticas/, "/stats"],
  [/^\/ajustes/, "/settings"],
  [/^\/bienvenida/, "/welcome"],
];

function rewriteLegacyPath(pathname: string): string | null {
  for (const [pattern, replacement] of LEGACY_PATH_REWRITES) {
    if (pattern.test(pathname)) return pathname.replace(pattern, replacement);
  }
  return null;
}

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
  const host = request.headers.get("host");
  if (host && LEGACY_HOSTS.has(host)) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.host = APP_CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  const { pathname } = request.nextUrl;

  const rewritten = rewriteLegacyPath(pathname);
  if (rewritten) {
    const url = new URL(request.url);
    url.pathname = rewritten;
    return NextResponse.redirect(url, 308);
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authenticated = await hasValidSession(request);

  if (!authenticated) {
    // La raíz no tiene su propia página pública: un visitante sin sesión
    // que pide "/" va a la landing (/welcome) en vez de directo al
    // formulario de login, sin tocar la ruta del dashboard.
    const destination = pathname === "/" ? "/welcome" : "/login";
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
