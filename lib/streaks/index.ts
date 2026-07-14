import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habitLogs, habitStreaks, habits } from "@/lib/db/schema";
import { getServerToday } from "@/lib/settings/date-server";
import { getCurrentUserId } from "@/lib/auth/session";
import { computeStreak } from "./compute";

export type StreakResult = { current: number; longest: number };

/**
 * Recomputes a habit's current and longest streak from habit_logs, and
 * caches the result. Standalone recompute utility (does its own
 * round-trips); the check-in write path (`lib/actions/logs.ts`) uses
 * `computeStreak` directly on data already loaded in a batch, to avoid
 * paying for those round-trips.
 */
export async function recalcStreakForHabit(habitId: string): Promise<StreakResult> {
  const userId = await getCurrentUserId();
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1);
  if (!habit) return { current: 0, longest: 0 };

  const today = await getServerToday();

  const logs = await db
    .select({ date: habitLogs.date, status: habitLogs.status })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), gte(habitLogs.date, habit.startDate)));

  const result = computeStreak(habit, logs, today);
  if (!result) return { current: 0, longest: 0 };

  await db
    .insert(habitStreaks)
    .values({ habitId, userId, lastComputedDate: today, ...result })
    .onConflictDoUpdate({
      target: habitStreaks.habitId,
      set: { lastComputedDate: today, ...result },
    });

  return { current: result.currentStreak, longest: result.longestStreak };
}

export async function getStreakMax(): Promise<number | null> {
  const userId = await getCurrentUserId();
  const rows = await db
    .select({ longestStreak: habitStreaks.longestStreak })
    .from(habitStreaks)
    .where(eq(habitStreaks.userId, userId));
  if (rows.length === 0) return null;
  return Math.max(0, ...rows.map((r) => r.longestStreak));
}

export async function getStreakFor(habitId: string): Promise<StreakResult> {
  const userId = await getCurrentUserId();
  const [row] = await db
    .select({ current: habitStreaks.currentStreak, longest: habitStreaks.longestStreak })
    .from(habitStreaks)
    .where(and(eq(habitStreaks.habitId, habitId), eq(habitStreaks.userId, userId)))
    .limit(1);
  return row ? { current: row.current, longest: row.longest } : { current: 0, longest: 0 };
}
