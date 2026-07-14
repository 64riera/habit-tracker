import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
