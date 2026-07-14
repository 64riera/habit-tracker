import { getTodayDateString } from "@/lib/date";
import { DAY_CUTOFF_COOKIE, DEFAULT_DAY_CUTOFF_HOUR } from "@/lib/settings/day-cutoff-shared";

/**
 * Client-side equivalent of `getDayCutoffHour()` (lib/settings/day-cutoff.ts)
 * + `getTodayDateString()` — the server helper is `server-only` and can't be
 * imported from a client component, but the cookie itself is plain
 * (not httpOnly), so reading it directly from `document.cookie` is safe.
 * For components mounted outside a route that already has `today` as a
 * server-passed prop (e.g. the root layout's floating focus indicators).
 *
 * SSR-safe: falls back to the default cutoff when `document` doesn't exist
 * yet. Only ever consulted alongside client-only state (the offline queue,
 * empty during the server render anyway), so the exact value used before
 * hydration never actually drives what gets rendered.
 */
export function getClientToday(): string {
  if (typeof document === "undefined") return getTodayDateString(DEFAULT_DAY_CUTOFF_HOUR);
  const match = document.cookie.match(new RegExp(`(?:^|; )${DAY_CUTOFF_COOKIE}=([^;]*)`));
  const parsed = match ? Number(decodeURIComponent(match[1])) : NaN;
  const cutoffHour = Number.isFinite(parsed) && parsed >= 0 && parsed <= 23 ? parsed : DEFAULT_DAY_CUTOFF_HOUR;
  return getTodayDateString(cutoffHour);
}
