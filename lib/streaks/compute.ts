import type { habits } from "@/lib/db/schema";
import { dateRange, monthKey } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";
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

  const currentMonth = monthKey(today);
  const freezesUsedThisMonth = applicableDates.filter(
    (date) => monthKey(date) === currentMonth && statusByDate.get(date) === "frozen"
  ).length;
  const freezesAvailable = Math.max(0, FREEZE_MONTHLY_ALLOWANCE - freezesUsedThisMonth);

  return { currentStreak: running, longestStreak: longest, freezesAvailable, freezesUsedThisMonth };
}
