import "server-only";
import { cache } from "react";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { categories, habitLogs, habitStreaks, habits } from "@/lib/db/schema";
import { isDateApplicable } from "@/lib/habits/frequency";
import { FREEZE_MONTHLY_ALLOWANCE } from "@/lib/habits/status";
import { CANONICAL_CATEGORIES } from "@/lib/habits/canonical-categories";
import { getCurrentUserId } from "@/lib/auth/session";

export type CategoryRow = typeof categories.$inferSelect;
export type HabitRow = typeof habits.$inferSelect;
export type HabitLogRow = typeof habitLogs.$inferSelect;

export type HabitWithExtras = HabitRow & {
  category: CategoryRow | null;
  todayLog: HabitLogRow | null;
  streak: { current: number; longest: number; freezesAvailable: number };
};

/** Categories are a fixed set (see lib/habits/canonical-categories.ts):
 * this self-heals any account that's still missing one — created before
 * that category existed, or before the fixed-taxonomy switch — instead of
 * requiring a one-off data migration. `includeHidden` is only for the
 * management screen, where a user needs to see (and re-enable) categories
 * they previously hid; everywhere else (habit form, focus category chips)
 * should only ever offer the visible ones. */
export const getCategories = cache(async (options: { includeHidden?: boolean } = {}): Promise<CategoryRow[]> => {
  const userId = await getCurrentUserId();
  let rows = await db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.sortOrder);

  const existingNames = new Set(rows.map((c) => c.nameEs));
  const missing = CANONICAL_CATEGORIES.filter((c) => !existingNames.has(c.nameEs));
  if (missing.length > 0) {
    const minSortOrder = rows.reduce((min, c) => Math.min(min, c.sortOrder), 0);
    await db
      .insert(categories)
      .values(
        missing.map((c, i) => ({
          id: nanoid(),
          userId,
          nameEs: c.nameEs,
          nameEn: c.nameEn,
          color: c.color,
          icon: c.icon,
          sortOrder: minSortOrder - missing.length + i,
        }))
      )
      // Two concurrent requests can both observe the same category as
      // "missing" before either commits; categories_user_name_idx exists
      // precisely to make that race safe to no-op instead of duplicating.
      .onConflictDoNothing();
    rows = await db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.sortOrder);
  }

  return options.includeHidden ? rows : rows.filter((c) => !c.hidden);
});

export const getHabitNames = cache(async (): Promise<{ id: string; name: string; categoryId: string | null }[]> => {
  const userId = await getCurrentUserId();
  return db
    .select({ id: habits.id, name: habits.name, categoryId: habits.categoryId })
    .from(habits)
    .where(eq(habits.userId, userId))
    .orderBy(habits.sortOrder);
});

async function attachExtras(rows: HabitRow[], date: string): Promise<HabitWithExtras[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [cats, logs, streaks] = await Promise.all([
    getCategories({ includeHidden: true }),
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

export const getHabitsForToday = cache(async (date: string): Promise<HabitWithExtras[]> => {
  const userId = await getCurrentUserId();
  const active = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.status, "active")));
  const applicable = active.filter((h) => isDateApplicable(h, date));
  const withExtras = await attachExtras(applicable, date);
  return withExtras.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
});

export const getActiveHabits = cache(async (date: string): Promise<HabitWithExtras[]> => {
  const userId = await getCurrentUserId();
  const active = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.status, "active")));
  const withExtras = await attachExtras(active, date);
  return withExtras.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
});

export const getAllHabitsForManagement = cache(async (date: string): Promise<HabitWithExtras[]> => {
  const userId = await getCurrentUserId();
  const all = await db.select().from(habits).where(eq(habits.userId, userId));
  const withExtras = await attachExtras(all, date);
  return withExtras.sort((a, b) => a.sortOrder - b.sortOrder);
});

export const getHabitById = cache(async (id: string): Promise<HabitWithExtras | null> => {
  const userId = await getCurrentUserId();
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .limit(1);
  if (!habit) return null;
  const [withExtras] = await attachExtras([habit], "9999-99-99");
  return withExtras;
});
