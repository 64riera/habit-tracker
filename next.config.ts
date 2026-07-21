import type { NextConfig } from "next";
import path from "node:path";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// No nonces (see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
// for the pattern this is adapted from): nonce-based CSP requires every
// page to render dynamically, AND a nonce only covers <style>/<script>
// elements, never the `style="..."` HTML attribute — this app sets inline
// styles via `style={{...}}` throughout, which nonces can't allow-list at
// all. `'unsafe-inline'` is the honest tradeoff for script/style-src here;
// still meaningfully restricts everything else (clickjacking, <object>/
// <base> injection, which origins the page can talk to).
function cspHeader(isDev: boolean): string {
  return [
    "default-src 'self'",
    // Dev-only additions: 'unsafe-eval' is what React's dev build needs to
    // reconstruct server-side error stacks in the browser (never used in
    // production, per Next's own CSP docs); va.vercel-scripts.com is where
    // @vercel/analytics and @vercel/speed-insights load their *.debug.js
    // build from outside of Vercel's own infra — in production they're
    // served same-origin instead (/_vercel/insights/script.js), already
    // covered by 'self', so this only needs to apply locally.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // data:/blob: for the OG image route's inline logo and any generated
    // preview images; the Google avatar shown in Settings after a Google
    // login (components/settings/profile-header.tsx) is the only external
    // image origin the app renders.
    "img-src 'self' data: blob: https://lh3.googleusercontent.com",
    "font-src 'self'",
    // Realtime sync (lib/realtime/client.tsx) connects to Pusher over both
    // wss and https depending on transport fallback.
    "connect-src 'self' https://*.pusher.com wss://*.pusher.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Dev serves over plain http://localhost — upgrading same-origin
    // subresource requests to https would just fail (no local cert).
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

// Config is a function of `phase` (Next's own documented way to tell dev
// apart from a production build/server — see next/constants), not
// `process.env.NODE_ENV`: that isn't reliably "development" yet when this
// module evaluates. Getting this wrong is worse than skipping it: once a
// browser sees Strict-Transport-Security for a host, even once, it refuses
// plain HTTP to that host again for the full `max-age` — up to two years —
// breaking `next dev`/`next start` on localhost:3000 long after this
// session ends, for any other project that happens to reuse that port.
export default function createNextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    turbopack: {
      root: path.resolve(__dirname),
    },
    // The migration in instrumentation.ts reads drizzle/*.sql + drizzle/meta
    // at runtime via fs, not via import, so Vercel's tracer can't detect it
    // on its own.
    outputFileTracingIncludes: {
      "/*": ["./drizzle/**/*"],
    },
    experimental: {
      // Default is 0: every soft navigation to a dynamic route re-runs its
      // Server Component from scratch, even to a route visited seconds ago.
      // This lets the router reuse the last-seen payload for a short window,
      // which is what actually makes SWR's cached reads visible on click —
      // without this, the route swap itself still blocks on the network.
      staleTimes: {
        dynamic: 30,
      },
    },
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "Content-Security-Policy", value: cspHeader(isDev) },
            // frame-ancestors above already covers modern browsers; this is
            // the equivalent for older ones that don't read CSP for framing.
            { key: "X-Frame-Options", value: "DENY" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            // None of these browser features are used anywhere in the app.
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
            ...(isDev
              ? []
              : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
          ],
        },
      ];
    },
  };
}
