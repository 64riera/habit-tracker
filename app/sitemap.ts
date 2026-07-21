import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/branding";

// Just the marketing page: everything else is behind auth (see robots.ts)
// and has nothing meaningful to offer a crawler.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${APP_URL}/welcome`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
