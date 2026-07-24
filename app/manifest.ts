import type { MetadataRoute } from "next";
import { APP_NAME, APP_NAME_FULL } from "@/lib/branding";
import { THEME_COLORS } from "@/lib/theme-colors";

// Fetched once by the OS at install time and cached from then on, so it
// can't track a signed-in user's saved light variant the way the live
// theme-color meta tag (see generateViewport in app/layout.tsx) does —
// this only sets the splash-screen/task-switcher color new installs start
// with. Kept at the "clear" default (see lib/theme-colors.ts) so it
// matches what an actual new install looks like.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME_FULL,
    short_name: APP_NAME,
    description: "Seguimiento cercano de hábitos personales, bilingüe ES/EN.",
    start_url: "/",
    display: "standalone",
    background_color: THEME_COLORS.clear,
    theme_color: THEME_COLORS.clear,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
