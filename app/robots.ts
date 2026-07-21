import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/branding";

// Almost everything past /welcome requires a session (see proxy.ts's
// PUBLIC_PATHS) — a crawler hitting those would just bounce off a redirect
// to /login, so there's no reason to spend crawl budget on them. Explicit
// `allow` for the few public paths wins over the broader `disallow: "/"`
// (longest-match-wins, the standard robots.txt conflict resolution).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/welcome", "/login", "/signup"],
      disallow: ["/", "/api/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
