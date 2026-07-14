/**
 * No `server-only` guard here on purpose: `lib/offline/client.tsx` (a
 * client component) needs the cookie names/defaults itself for background
 * offline-section refreshes, and can't import anything that pulls in
 * `next/headers`.
 */
export const DAY_CUTOFF_COOKIE = "justgo_day_cutoff";
export const DEFAULT_DAY_CUTOFF_HOUR = 3;

/** Mirrors the day-cutoff cookie above, but for the user's IANA timezone
 * (e.g. "America/Bogota") — set client-side by `timezone-sync.tsx` via
 * `setTimezone()`. Lets the server resolve "today" for the *user's* local
 * day without a DB round trip on every request. Falls back to UTC (the
 * server process's own zone on Vercel) only for the brief window before a
 * browser has ever run `TimezoneSync`, e.g. the very first SSR pass. */
export const TIMEZONE_COOKIE = "justgo_timezone";
export const DEFAULT_TIMEZONE = "UTC";
