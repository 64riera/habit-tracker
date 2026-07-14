import { getTodayDateString } from "@/lib/date";
import { DAY_CUTOFF_COOKIE, DEFAULT_DAY_CUTOFF_HOUR, DEFAULT_TIMEZONE } from "@/lib/settings/date-shared";

/**
 * Client-side equivalent of `getServerToday()` (lib/settings/date-server.ts)
 * — the server helper is `server-only` and can't be imported from a client
 * component. The cutoff-hour cookie itself is plain (not httpOnly), so
 * reading it directly from `document.cookie` is safe; the timezone doesn't
 * need a cookie round trip at all here, since `Intl` already knows the
 * device's real IANA zone directly. For components mounted outside a route
 * that already has `today` as a server-passed prop (e.g. the root layout's
 * floating focus indicators).
 *
 * SSR-safe: falls back to the default cutoff/timezone when `document`
 * doesn't exist yet. Only ever consulted alongside client-only state (the
 * offline queue, empty during the server render anyway), so the exact value
 * used before hydration never actually drives what gets rendered.
 */
export function getClientToday(): string {
  if (typeof document === "undefined") return getTodayDateString(DEFAULT_DAY_CUTOFF_HOUR, DEFAULT_TIMEZONE);
  const match = document.cookie.match(new RegExp(`(?:^|; )${DAY_CUTOFF_COOKIE}=([^;]*)`));
  const parsed = match ? Number(decodeURIComponent(match[1])) : NaN;
  const cutoffHour = Number.isFinite(parsed) && parsed >= 0 && parsed <= 23 ? parsed : DEFAULT_DAY_CUTOFF_HOUR;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  return getTodayDateString(cutoffHour, timezone);
}
