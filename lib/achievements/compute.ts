import type { HabitRow, LogStatusRow, StreakComputation } from "@/lib/streaks/compute";
import { dateRange, monthKey } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";
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
  const applicable = daysInMonth.filter((d) => isDateApplicable(habit, d) && d <= today);
  if (applicable.length < 7) return false;

  const statusByDate = new Map(logs.map((l) => [l.date, l.status]));

  // The skip limit is computed over the habit's entire history, since a
  // weekly period can start before the current month.
  const allApplicable = dateRange(habit.startDate, today).filter((d) => isDateApplicable(habit, d));
  const overLimit = overLimitSkipDates(habit, allApplicable, statusByDate);

  return applicable.every((d) => {
    const status = statusByDate.get(d);
    return status ? keepsStreakOn(status, d, overLimit) : d === today;
  });
}
