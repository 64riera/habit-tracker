import type { habits } from "@/lib/db/schema";
import { dateRange, monthKey } from "@/lib/date";
import { isDateApplicable, parseFrequencyConfig, periodKeyFor } from "@/lib/habits/frequency";
import { overLimitSkipDates, keepsStreakOn, FREEZE_MONTHLY_ALLOWANCE } from "@/lib/habits/status";

export type HabitRow = typeof habits.$inferSelect;
export type LogStatusRow = { date: string; status: string };

export type StreakComputation = {
  currentStreak: number;
  longestStreak: number;
  freezesAvailable: number;
  freezesUsedThisMonth: number;
};

/**
 * Pure computation (no I/O) of the current/longest streak and available
 * freezes from the already-loaded logs. `null` if the habit hasn't started
 * yet — in that case there's nothing to persist in habit_streaks (same as
 * the original behavior of recalcStreakForHabit).
 */
export function computeStreak(
  habit: HabitRow,
  logs: LogStatusRow[],
  today: string
): StreakComputation | null {
  if (habit.startDate > today) return null;

  const statusByDate = new Map(logs.map((l) => [l.date, l.status]));
  const applicableDates = dateRange(habit.startDate, today).filter((d) => isDateApplicable(habit, d));
  const overLimit = overLimitSkipDates(habit, applicableDates, statusByDate);

  const isPeriodic = habit.frequencyType === "x_per_week" || habit.frequencyType === "x_per_month";
  const { longest, running } = isPeriodic
    ? computePeriodicStreak(habit, applicableDates, statusByDate, overLimit, today)
    : computeDailyStreak(applicableDates, statusByDate, overLimit, today);

  // Counted from the raw logs, not `applicableDates`: a freeze already
  // spent stays spent even if the habit's frequency changes afterward and
  // that date is no longer considered "applicable" under the new config —
  // otherwise this number (and the "freezes available" derived from it)
  // would drift from what `freezeHabitDay` (lib/actions/logs.ts) actually
  // enforces, which counts every frozen log in the month regardless of
  // current applicability. A user could otherwise see "1 freeze left" and
  // have the server refuse it.
  const currentMonth = monthKey(today);
  const freezesUsedThisMonth = logs.filter((l) => monthKey(l.date) === currentMonth && l.status === "frozen").length;
  const freezesAvailable = Math.max(0, FREEZE_MONTHLY_ALLOWANCE - freezesUsedThisMonth);

  return { currentStreak: running, longestStreak: longest, freezesAvailable, freezesUsedThisMonth };
}

type RunningStreak = { longest: number; running: number };

/** daily / weekdays / custom_interval: every applicable date is its own
 * link in the chain — a single missed applicable day breaks it. */
function computeDailyStreak(
  applicableDates: string[],
  statusByDate: Map<string, string>,
  overLimit: Set<string>,
  today: string
): RunningStreak {
  let longest = 0;
  let running = 0;

  for (const date of applicableDates) {
    const status = statusByDate.get(date);
    const isToday = date === today;

    if (keepsStreakOn(status, date, overLimit)) {
      running += 1;
      longest = Math.max(longest, running);
    } else if (!status && isToday) {
      // Today hasn't been logged yet: doesn't break the streak, but doesn't count yet either.
    } else {
      running = 0;
    }
  }

  return { longest, running };
}

/**
 * x_per_week / x_per_month: unlike the daily case, every date is marked
 * "applicable" (see `isDateApplicable`) because there's no fixed day — the
 * habit just needs `timesPerPeriod` qualifying days somewhere within each
 * week/month. Judging that day-by-day (the daily algorithm above) would
 * demand a qualifying status on literally every day, which is exactly the
 * bug this fixes: it made "3x/week" behave like "every day", ignoring
 * `timesPerPeriod` entirely.
 *
 * Dates are grouped into periods instead. `applicableDates` never extends
 * past `today`, so every period *except* the one containing `today` is
 * necessarily already over — its outcome is final. A period that reached
 * its quota extends the running (day-counted) streak by every date in it
 * (so the display stays "N days", consistent with every other frequency
 * type); a finished period that fell short breaks it. The period
 * containing `today` is judged the same way once its quota is already
 * met (credited immediately, same as a daily habit's "done today" without
 * waiting for the day to end) — but while short, it's left neutral rather
 * than breaking the streak early, mirroring the daily case's "today not
 * logged yet" branch, since the period genuinely isn't decided yet.
 */
function computePeriodicStreak(
  habit: HabitRow,
  applicableDates: string[],
  statusByDate: Map<string, string>,
  overLimit: Set<string>,
  today: string
): RunningStreak {
  const timesPerPeriod = parseFrequencyConfig(habit.frequencyConfig).timesPerPeriod ?? 1;

  const periods = new Map<string, string[]>();
  for (const date of applicableDates) {
    const key = periodKeyFor(habit, date);
    const dates = periods.get(key);
    if (dates) dates.push(date);
    else periods.set(key, [date]);
  }

  let longest = 0;
  let running = 0;

  for (const periodDates of periods.values()) {
    const qualifyingCount = periodDates.filter((date) => keepsStreakOn(statusByDate.get(date), date, overLimit)).length;
    const metQuota = qualifyingCount >= timesPerPeriod;
    const isCurrentPeriod = periodDates.includes(today);

    if (metQuota) {
      running += periodDates.length;
      longest = Math.max(longest, running);
    } else if (!isCurrentPeriod) {
      running = 0;
    }
    // Current period, quota not yet met: undecided — leave `running` as-is.
  }

  return { longest, running };
}
