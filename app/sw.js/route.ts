import { NextResponse } from "next/server";
import { SW_SOURCE } from "@/lib/sw/sw-source";

export const dynamic = "force-static";

// Ties the Service Worker's cache namespace to this specific deploy instead
// of a hand-maintained constant. Without this, a route's cached HTML
// (including the bottom nav it renders) stays in the Cache Storage
// indefinitely across deploys, since browsers only detect a Service Worker
// update by diffing its script bytes — a change to app code alone (e.g.
// moving a nav item between the bottom bar and "Más") never touches this
// file, so the old worker keeps running and old cache entries never expire.
// Different routes end up cached from different deploys, so the bottom nav
// looks different depending on which screen was last opened while online —
// exactly the bug this fixes. `VERCEL_GIT_COMMIT_SHA` is set automatically
// on every Vercel deployment; the Date.now() fallback only matters for
// local `next build`/`next start`, where "changes every build" is enough.
const DEPLOY_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? String(Date.now());

const swSource = SW_SOURCE.replace("__CACHE_VERSION__", `just-go-${DEPLOY_ID}`);

export async function GET() {
  return new NextResponse(swSource, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // The SW script itself must never be HTTP-cached by the browser, or
      // browsers would keep re-serving a stale worker the same way an
      // unversioned CACHE_VERSION did — the whole point of this file is to
      // always be re-checked so a new deploy is detected promptly.
      "Cache-Control": "no-cache",
    },
  });
}
