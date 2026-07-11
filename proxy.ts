import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { APP_CANONICAL_HOST } from "@/lib/branding";

const SESSION_COOKIE = "justgo_session";
// /api/cron/reminders has no user session (it's called by an external
// cron, see .github/workflows/push-reminders.yml) — it authenticates with
// its own shared secret (CRON_SECRET) inside the route handler, not a cookie.
const PUBLIC_PATHS = ["/login", "/signup", "/welcome", "/manifest.webmanifest", "/api/auth/google", "/api/cron/reminders"];

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
