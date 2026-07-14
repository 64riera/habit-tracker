import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { APP_CANONICAL_HOST } from "@/lib/branding";

const SESSION_COOKIE = "justgo_session";
// /api/cron/* routes have no user session (they're called by an external
// cron, see .github/workflows/push-reminders.yml) — each authenticates with
// its own shared secret (CRON_SECRET) inside the route handler, not a cookie.
// /offline is the service worker's navigation fallback (see public/sw.js)
// and gets precached at SW-install time, which can happen before any
// login (RegisterServiceWorker mounts in the root layout). If it weren't
// public, that precache fetch would follow the redirect to /login and
// cache the login page under the "/offline" key instead.
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/welcome",
  "/offline",
  "/manifest.webmanifest",
  "/api/auth/google",
  "/api/cron/",
  // Temporary, see app/api/admin/repair-gym-table/route.ts — self-authenticates
  // with its own secret header, same reasoning as /api/cron/. Remove both together.
  "/api/admin/repair-gym-table",
];

// Old domain (before the rebrand to "Just Go"): redirect permanently
// instead of serving the app there, so we don't break direct links or the
// PWA already installed by anyone who had habits.srivera.xyz.
const LEGACY_HOSTS = new Set(["habits.srivera.xyz", "www.habits.srivera.xyz"]);

// Old Spanish routes (before the whole codebase moved to English):
// redirect to the new route instead of 404ing, so we don't break
// bookmarks or already-installed shortcuts. Order matters — the most
// specific prefixes go first, otherwise "/habitos/rutinas" would fall
// into the generic "/habitos" rule before reaching its own.
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
    // The root has no public page of its own: a visitor without a
    // session requesting "/" goes to the landing page (/welcome) instead
    // of straight to the login form, without touching the dashboard route.
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
