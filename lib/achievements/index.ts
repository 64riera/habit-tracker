import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { achievements, habitLogs, habitStreaks, habits } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { getCurrentUserId } from "@/lib/auth/session";
import { computeNewAchievements, type AchievementType } from "./compute";

export type { AchievementType };

/**
 * Checks unlock conditions after a check-in and returns any new
 * achievements. Standalone recompute utility (does its own round-trips);
 * the check-in write path (`lib/actions/logs.ts`) uses
 * `computeNewAchievements` directly on data already loaded in a batch, to
 * avoid paying for those round-trips.
 */
export async function maybeUnlockAchievements(habitId: string): Promise<AchievementType[]> {
  const userId = await getCurrentUserId();

  const [[streakRow], [habit], unlockedRows] = await Promise.all([
    db
      .select()
      .from(habitStreaks)
      .where(and(eq(habitStreaks.habitId, habitId), eq(habitStreaks.userId, userId)))
      .limit(1),
    db.select().from(habits).where(and(eq(habits.id, habitId), eq(habits.userId, userId))).limit(1),
    db
      .select({ type: achievements.type })
      .from(achievements)
      .where(and(eq(achievements.userId, userId), eq(achievements.habitId, habitId))),
  ]);
  if (!streakRow || !habit) return [];

  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

  const logs = await db
    .select({ date: habitLogs.date, status: habitLogs.status })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), gte(habitLogs.date, habit.startDate)));

  const unlocked = computeNewAchievements({
    habit,
    logs,
    streak: {
      currentStreak: streakRow.currentStreak,
      longestStreak: streakRow.longestStreak,
      freezesAvailable: streakRow.freezesAvailable,
      freezesUsedThisMonth: streakRow.freezesUsedThisMonth,
    },
    alreadyUnlockedTypes: new Set(unlockedRows.map((r) => r.type as AchievementType)),
    today,
  });

  for (const type of unlocked) {
    await db.insert(achievements).values({ id: nanoid(), userId, habitId, type });
  }

  return unlocked;
}
