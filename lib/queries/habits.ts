import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, habitLogs, habitStreaks, habits } from "@/lib/db/schema";
import { isDateApplicable } from "@/lib/habits/frequency";
import { FREEZE_MONTHLY_ALLOWANCE } from "@/lib/habits/status";
import { getCurrentUserId } from "@/lib/auth/session";

export type CategoryRow = typeof categories.$inferSelect;
export type HabitRow = typeof habits.$inferSelect;
export type HabitLogRow = typeof habitLogs.$inferSelect;

export type HabitWithExtras = HabitRow & {
  category: CategoryRow | null;
  todayLog: HabitLogRow | null;
  streak: { current: number; longest: number; freezesAvailable: number };
};

export async function getCategories(): Promise<CategoryRow[]> {
  const userId = await getCurrentUserId();
  return db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.sortOrder);
}

export async function getHabitNames(): Promise<{ id: string; name: string }[]> {
  const userId = await getCurrentUserId();
  return db
    .select({ id: habits.id, name: habits.name })
    .from(habits)
    .where(eq(habits.userId, userId))
    .orderBy(habits.sortOrder);
}

async function attachExtras(rows: HabitRow[], date: string, userId: string): Promise<HabitWithExtras[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [cats, logs, streaks] = await Promise.all([
    db.select().from(categories).where(eq(categories.userId, userId)),
    db
      .select()
      .from(habitLogs)
      .where(and(inArray(habitLogs.habitId, ids), eq(habitLogs.date, date))),
    db.select().from(habitStreaks).where(inArray(habitStreaks.habitId, ids)),
  ]);

  const catById = new Map(cats.map((c) => [c.id, c]));
  const logByHabit = new Map(logs.map((l) => [l.habitId, l]));
  const streakByHabit = new Map(streaks.map((s) => [s.habitId, s]));

  return rows.map((h) => ({
    ...h,
    category: h.categoryId ? catById.get(h.categoryId) ?? null : null,
    todayLog: logByHabit.get(h.id) ?? null,
    streak: {
      current: streakByHabit.get(h.id)?.currentStreak ?? 0,
      longest: streakByHabit.get(h.id)?.longestStreak ?? 0,
      freezesAvailable: streakByHabit.get(h.id)?.freezesAvailable ?? FREEZE_MONTHLY_ALLOWANCE,
    },
  }));
}

export async function getHabitsForToday(date: string): Promise<HabitWithExtras[]> {
  const userId = await getCurrentUserId();
  const active = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.status, "active")));
  const applicable = active.filter((h) => isDateApplicable(h, date));
  const withExtras = await attachExtras(applicable, date, userId);
  return withExtras.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
}

export async function getActiveHabits(date: string): Promise<HabitWithExtras[]> {
  const userId = await getCurrentUserId();
  const active = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.status, "active")));
  const withExtras = await attachExtras(active, date, userId);
  return withExtras.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
}

export async function getAllHabitsForManagement(date: string): Promise<HabitWithExtras[]> {
  const userId = await getCurrentUserId();
  const all = await db.select().from(habits).where(eq(habits.userId, userId));
  const withExtras = await attachExtras(all, date, userId);
  return withExtras.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getHabitById(id: string): Promise<HabitWithExtras | null> {
  const userId = await getCurrentUserId();
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .limit(1);
  if (!habit) return null;
  const [withExtras] = await attachExtras([habit], "9999-99-99", userId);
  return withExtras;
}
