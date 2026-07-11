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
};

export default nextConfig;
