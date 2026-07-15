import "server-only";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { achievements, habits } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import type { AchievementType } from "@/lib/achievements";

const ACHIEVEMENT_TYPES: AchievementType[] = [
  "7_days",
  "30_days",
  "100_days",
  "perfect_month",
  "comeback",
];

export type HabitAchievements = {
  habitId: string;
  habitName: string;
  badges: { type: AchievementType; unlockedAt: string | null }[];
};

export const getAchievementsByHabit = cache(async (): Promise<HabitAchievements[]> => {
  const userId = await getCurrentUserId();
  const [allHabits, unlocked] = await Promise.all([
    db
      .select({ id: habits.id, name: habits.name })
      .from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.status, "active"))),
    db.select().from(achievements).where(eq(achievements.userId, userId)),
  ]);

  const byHabit = new Map<string, Map<AchievementType, string>>();
  for (const a of unlocked) {
    if (!a.habitId) continue;
    if (!byHabit.has(a.habitId)) byHabit.set(a.habitId, new Map());
    byHabit.get(a.habitId)!.set(a.type as AchievementType, a.unlockedAt);
  }

  return allHabits.map((h) => ({
    habitId: h.id,
    habitName: h.name,
    badges: ACHIEVEMENT_TYPES.map((type) => ({
      type,
      unlockedAt: byHabit.get(h.id)?.get(type) ?? null,
    })),
  }));
});
