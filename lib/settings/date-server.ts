import "server-only";
import { cookies } from "next/headers";
import { getTodayDateString } from "@/lib/date";
import { getTimezonePreference } from "@/lib/queries/user";
import { DAY_CUTOFF_COOKIE, DEFAULT_DAY_CUTOFF_HOUR, DEFAULT_TIMEZONE, TIMEZONE_COOKIE } from "./date-shared";

export { DEFAULT_DAY_CUTOFF_HOUR };

export async function getDayCutoffHour(): Promise<number> {
  const store = await cookies();
  const raw = store.get(DAY_CUTOFF_COOKIE)?.value;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 23 ? parsed : DEFAULT_DAY_CUTOFF_HOUR;
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The user's real IANA timezone, resolved server-side. Prefers the cookie
 * (set alongside the DB column by `setTimezone`, see
 * `lib/actions/preferences.ts`) since it's available on every request with
 * no extra round trip; falls back to the DB column for a request that
 * arrives without it (e.g. a fresh cookie jar on a new device that already
 * has a session); falls back to `DEFAULT_TIMEZONE` only for a genuinely
 * first-ever load, before any client JS has run `TimezoneSync` even once.
 */
export async function getUserTimezone(): Promise<string> {
  const store = await cookies();
  const cookieValue = store.get(TIMEZONE_COOKIE)?.value;
  if (cookieValue && isValidTimezone(cookieValue)) return cookieValue;
  const saved = await getTimezonePreference();
  return saved && isValidTimezone(saved) ? saved : DEFAULT_TIMEZONE;
}

/**
 * The single source of truth for "what day is it" on the server — resolves
 * the user's day-cutoff hour and real IANA timezone together and applies
 * them to `now`. Every server action/component that needs "today" should
 * call this instead of composing `getDayCutoffHour()` +
 * `getTodayDateString()` by hand, so there's exactly one place that
 * decides how those two settings combine.
 */
export async function getServerToday(now: Date = new Date()): Promise<string> {
  const [cutoffHour, timezone] = await Promise.all([getDayCutoffHour(), getUserTimezone()]);
  return getTodayDateString(cutoffHour, timezone, now);
}
