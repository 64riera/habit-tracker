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
 * Cómputo puro (sin I/O) de qué logros se desbloquean tras un check-in.
 * Reutiliza el mismo array de `logs` que ya carga el cómputo de racha
 * (desde habit.startDate hasta hoy) — no vuelve a leer el historial completo.
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

  // Corte por fechas (sin tocar la base) antes de evaluar los logs: evita
  // falsos positivos muy al inicio del mes, cuando no puede ser "perfecto" todavía.
  const daysInMonth = dateRange(monthStart, today).filter((d) => monthKey(d) === currentMonth);
  const applicable = daysInMonth.filter((d) => isDateApplicable(habit, d) && d <= today);
  if (applicable.length < 7) return false;

  const statusByDate = new Map(logs.map((l) => [l.date, l.status]));

  // El límite de skips se calcula sobre todo el historial del hábito, ya que un
  // período semanal puede empezar antes del mes en curso.
  const allApplicable = dateRange(habit.startDate, today).filter((d) => isDateApplicable(habit, d));
  const overLimit = overLimitSkipDates(habit, allApplicable, statusByDate);

  return applicable.every((d) => {
    const status = statusByDate.get(d);
    return status ? keepsStreakOn(status, d, overLimit) : d === today;
  });
}
