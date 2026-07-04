import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // La migracion en instrumentation.ts lee drizzle/*.sql + drizzle/meta en
  // runtime via fs, no via import: el tracer de Vercel no lo detecta solo.
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
};

export default nextConfig;
