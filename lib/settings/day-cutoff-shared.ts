/**
 * No `server-only` guard here on purpose: `lib/offline/client.tsx` (a
 * client component) needs the cookie name and default to read the day
 * cutoff itself for background offline-section refreshes, and can't import
 * anything that pulls in `next/headers`.
 */
export const DAY_CUTOFF_COOKIE = "justgo_day_cutoff";
export const DEFAULT_DAY_CUTOFF_HOUR = 3;
