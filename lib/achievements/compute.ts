import type { HabitRow, LogStatusRow, StreakComputation } from "@/lib/streaks/compute";
import { dateRange, monthKey } from "@/lib/date";
import { isDateApplicable, parseFrequencyConfig, periodKeyFor } from "@/lib/habits/frequency";
import { overLimitSkipDates, keepsStreakOn } from "@/lib/habits/status";

export type AchievementType = "7_days" | "30_days" | "100_days" | "perfect_month" | "comeback";

const STREAK_MILESTONES: { type: AchievementType; days: number }[] = [
  { type: "7_days", days: 7 },
  { type: "30_days", days: 30 },
  { type: "100_days", days: 100 },
];

/**
 * Pure computation (no I/O) of which achievements unlock after a check-in.
 * Reuses the same `logs` array already loaded by the streak computation
 * (from habit.startDate to today) — it doesn't re-read the full history.
 */
export function computeNewAchievements({
  habit,
  logs,
  streak,
  alreadyUnlockedTypes,
  today,
}: {
  habit: HabitRow;
  logs: LogStatusRow[];
  streak: StreakComputation;
  alreadyUnlockedTypes: Set<AchievementType>;
  today: string;
}): AchievementType[] {
  const unlocked: AchievementType[] = [];

  for (const milestone of STREAK_MILESTONES) {
    if (streak.currentStreak >= milestone.days && !alreadyUnlockedTypes.has(milestone.type)) {
      unlocked.push(milestone.type);
    }
  }

  if (streak.currentStreak === 3 && streak.longestStreak > 3 && !alreadyUnlockedTypes.has("comeback")) {
    unlocked.push("comeback");
  }

  if (!alreadyUnlockedTypes.has("perfect_month") && checkPerfectMonth(habit, logs, today)) {
    unlocked.push("perfect_month");
  }

  return unlocked;
}

function checkPerfectMonth(habit: HabitRow, logs: LogStatusRow[], today: string): boolean {
  const currentMonth = monthKey(today);
  const monthStart = `${currentMonth}-01`;
  if (monthStart < habit.startDate) return false;

  // Date-based cutoff (without touching the DB) before evaluating the logs:
  // avoids false positives very early in the month, when it can't be "perfect" yet.
  const daysInMonth = dateRange(monthStart, today).filter((d) => monthKey(d) === currentMonth);
  if (daysInMonth.length < 7) return false;

  const statusByDate = new Map(logs.map((l) => [l.date, l.status]));

  // The skip limit is computed over the habit's entire history, since a
  // weekly period can start before the current month.
  const allApplicable = dateRange(habit.startDate, today).filter((d) => isDateApplicable(habit, d));
  const overLimit = overLimitSkipDates(habit, allApplicable, statusByDate);

  if (habit.frequencyType === "x_per_week" || habit.frequencyType === "x_per_month") {
    // Every applicable date is marked "applicable" for these types (there's
    // no fixed day — see isDateApplicable), so the day-by-day check below
    // would demand a log on literally every day, same bug as the one fixed
    // in lib/streaks/compute.ts. "Perfect" here means every period
    // (week/month) that overlaps this month met its own quota, judged by
    // its full date range — a week straddling the month boundary is judged
    // as a whole, since the quota is period-wide, not month-bound.
    const timesPerPeriod = parseFrequencyConfig(habit.frequencyConfig).timesPerPeriod ?? 1;
    const periods = new Map<string, string[]>();
    for (const date of allApplicable) {
      const key = periodKeyFor(habit, date);
      const dates = periods.get(key);
      if (dates) dates.push(date);
      else periods.set(key, [date]);
    }
    const periodsOverlappingMonth = [...periods.values()].filter((dates) => dates.some((d) => monthKey(d) === currentMonth));
    return periodsOverlappingMonth.every(
      (dates) => dates.filter((d) => keepsStreakOn(statusByDate.get(d), d, overLimit)).length >= timesPerPeriod
    );
  }

  const applicable = daysInMonth.filter((d) => isDateApplicable(habit, d) && d <= today);
  return applicable.every((d) => {
    const status = statusByDate.get(d);
    return status ? keepsStreakOn(status, d, overLimit) : d === today;
  });
}
