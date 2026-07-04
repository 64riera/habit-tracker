import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habitLogs, habitStreaks, habits } from "@/lib/db/schema";
import { dateRange, getTodayDateString, monthKey } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";
import { overLimitSkipDates, keepsStreakOn, FREEZE_MONTHLY_ALLOWANCE } from "@/lib/habits/status";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";

export type StreakResult = { current: number; longest: number };

/** Recalcula racha actual y máxima de un hábito a partir de habit_logs, y cachea el resultado. */
export async function recalcStreakForHabit(habitId: string): Promise<StreakResult> {
  const [habit] = await db.select().from(habits).where(eq(habits.id, habitId)).limit(1);
  if (!habit) return { current: 0, longest: 0 };

  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  if (habit.startDate > today) return { current: 0, longest: 0 };

  const logs = await db
    .select({ date: habitLogs.date, status: habitLogs.status })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), gte(habitLogs.date, habit.startDate)));

  const statusByDate = new Map(logs.map((l) => [l.date, l.status]));
  const applicableDates = dateRange(habit.startDate, today).filter((d) =>
    isDateApplicable(habit, d)
  );
  const overLimit = overLimitSkipDates(habit, applicableDates, statusByDate);

  let longest = 0;
  let running = 0;
  let current = 0;

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
  current = running;

  const currentMonth = monthKey(today);
  const freezesUsedThisMonth = applicableDates.filter(
    (date) => monthKey(date) === currentMonth && statusByDate.get(date) === "frozen"
  ).length;
  const freezesAvailable = Math.max(0, FREEZE_MONTHLY_ALLOWANCE - freezesUsedThisMonth);

  await db
    .insert(habitStreaks)
    .values({
      habitId,
      currentStreak: current,
      longestStreak: longest,
      freezesAvailable,
      freezesUsedThisMonth,
      lastComputedDate: today,
    })
    .onConflictDoUpdate({
      target: habitStreaks.habitId,
      set: {
        currentStreak: current,
        longestStreak: longest,
        freezesAvailable,
        freezesUsedThisMonth,
        lastComputedDate: today,
      },
    });

  return { current, longest };
}

export async function getStreakMax(): Promise<number | null> {
  const rows = await db
    .select({ longestStreak: habitStreaks.longestStreak })
    .from(habitStreaks);
  if (rows.length === 0) return null;
  return Math.max(0, ...rows.map((r) => r.longestStreak));
}

export async function getStreakFor(habitId: string): Promise<StreakResult> {
  const [row] = await db
    .select({ current: habitStreaks.currentStreak, longest: habitStreaks.longestStreak })
    .from(habitStreaks)
    .where(eq(habitStreaks.habitId, habitId))
    .limit(1);
  return row ? { current: row.current, longest: row.longest } : { current: 0, longest: 0 };
}
