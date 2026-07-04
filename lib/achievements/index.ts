import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { achievements, habitLogs, habitStreaks, habits } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { dateRange, getTodayDateString, monthKey } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";
import { overLimitSkipDates, keepsStreakOn } from "@/lib/habits/status";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";

export type AchievementType = "7_days" | "30_days" | "100_days" | "perfect_month" | "comeback";

const STREAK_MILESTONES: { type: AchievementType; days: number }[] = [
  { type: "7_days", days: 7 },
  { type: "30_days", days: 30 },
  { type: "100_days", days: 100 },
];

async function alreadyUnlocked(habitId: string, type: AchievementType) {
  const rows = await db
    .select({ id: achievements.id })
    .from(achievements)
    .where(and(eq(achievements.habitId, habitId), eq(achievements.type, type)))
    .limit(1);
  return rows.length > 0;
}

async function unlock(habitId: string | null, type: AchievementType) {
  await db.insert(achievements).values({ id: nanoid(), habitId, type });
}

/** Revisa condiciones de desbloqueo tras un check-in y devuelve los logros nuevos. */
export async function maybeUnlockAchievements(
  habitId: string
): Promise<AchievementType[]> {
  const unlocked: AchievementType[] = [];

  const [[streak], [habit]] = await Promise.all([
    db.select().from(habitStreaks).where(eq(habitStreaks.habitId, habitId)).limit(1),
    db.select().from(habits).where(eq(habits.id, habitId)).limit(1),
  ]);
  if (!streak || !habit) return unlocked;

  for (const milestone of STREAK_MILESTONES) {
    if (streak.currentStreak >= milestone.days && !(await alreadyUnlocked(habitId, milestone.type))) {
      await unlock(habitId, milestone.type);
      unlocked.push(milestone.type);
    }
  }

  if (streak.currentStreak === 3 && streak.longestStreak > 3) {
    if (!(await alreadyUnlocked(habitId, "comeback"))) {
      await unlock(habitId, "comeback");
      unlocked.push("comeback");
    }
  }

  if (await checkPerfectMonth(habit)) {
    if (!(await alreadyUnlocked(habitId, "perfect_month"))) {
      await unlock(habitId, "perfect_month");
      unlocked.push("perfect_month");
    }
  }

  return unlocked;
}

async function checkPerfectMonth(habit: typeof habits.$inferSelect): Promise<boolean> {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const currentMonth = monthKey(today);
  const monthStart = `${currentMonth}-01`;
  if (monthStart < habit.startDate) return false;

  // Corte por fechas (sin tocar la base) antes del scan de logs: evita una
  // consulta completa del historial en cada check-in durante la primera
  // semana de cada mes, cuando el mes no puede ser "perfecto" todavía.
  const daysInMonth = dateRange(monthStart, today).filter((d) => monthKey(d) === currentMonth);
  const applicable = daysInMonth.filter((d) => isDateApplicable(habit, d) && d <= today);
  if (applicable.length < 7) return false; // evita falsos positivos muy al inicio del mes

  const logs = await db
    .select({ date: habitLogs.date, status: habitLogs.status })
    .from(habitLogs)
    .where(eq(habitLogs.habitId, habit.id));
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
