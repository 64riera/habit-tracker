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
 * Cómputo puro (sin I/O) de racha actual/máxima y comodines disponibles a partir
 * de los logs ya cargados. `null` si el hábito todavía no ha empezado — en ese
 * caso no hay nada que persistir en habit_streaks (igual que el comportamiento
 * original de recalcStreakForHabit).
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
      // Hoy aún no se registra: no rompe la racha, pero tampoco suma todavía.
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
