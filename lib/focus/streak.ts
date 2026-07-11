import { addDays } from "@/lib/date";

/** Defensive cap for the backward walk — avoids an infinite loop if
 * `goalMinutes` were 0 or negative (should never happen, `dailyGoalMinutes`
 * has a minimum greater than 0 in the focus settings form). */
const MAX_LOOKBACK_DAYS = 3650;

/**
 * Streak of consecutive days meeting the daily focus goal, pure (no I/O):
 * `dailyMinutesByDate` only needs to bring the days with at least one
 * *completed* session (cancelled sessions and the in-progress one don't
 * count, see the product decision in the focus history) — a day absent
 * from the map is treated the same as a day with 0 minutes.
 *
 * `today` doesn't count as breaking the streak if it hasn't reached the
 * goal yet: the day is still in progress (per the day cutoff already
 * applied by the caller), so the current streak starts yesterday if today
 * doesn't meet the goal yet.
 */
export function computeFocusStreak(
  dailyMinutesByDate: Map<string, number>,
  goalMinutes: number,
  today: string
): { current: number; longest: number } {
  const meets = (date: string) => (dailyMinutesByDate.get(date) ?? 0) >= goalMinutes;

  let current = 0;
  let cursor = meets(today) ? today : addDays(today, -1);
  for (let step = 0; step < MAX_LOOKBACK_DAYS && meets(cursor); step++) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const dates = [...dailyMinutesByDate.keys()].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    if (!meets(date)) {
      run = 0;
      continue;
    }
    run = i > 0 && addDays(dates[i - 1], 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  return { current, longest: Math.max(longest, current) };
}
