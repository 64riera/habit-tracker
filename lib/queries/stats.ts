import "server-only";
import { cache } from "react";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habitLogs, habits, categories, habitStreaks } from "@/lib/db/schema";
import { addDays, dateRange } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";
import { overLimitSkipDates, keepsStreakOn } from "@/lib/habits/status";
import { getCurrentUserId } from "@/lib/auth/session";
import type { HabitRow } from "@/lib/queries/habits";

/** Memoized: every stats view below needs the same active-habit list, and
 * they're always fetched together (see stats-read.ts) — without this each
 * one would issue its own identical `SELECT ... FROM habits` on the same
 * request. */
const getActiveHabits = cache(async (): Promise<HabitRow[]> => {
  const userId = await getCurrentUserId();
  return db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.status, "active")));
});

async function logsSince(habitIds: string[], from: string) {
  if (habitIds.length === 0) return [];
  return db
    .select({ habitId: habitLogs.habitId, date: habitLogs.date, status: habitLogs.status })
    .from(habitLogs)
    .where(and(inArray(habitLogs.habitId, habitIds), gte(habitLogs.date, from)));
}

/** Widest window any stats view below needs (90 days, for pct90 and the
 * stat cards). Narrower views (7/14/30-day trend, category %) just look up
 * dates within this same map instead of re-querying a smaller range — a log
 * entry outside the narrower window is simply never read, so serving every
 * view off one superset changes nothing about their results. Memoized per
 * `today` since getOverallStats/getTrend/getCategoryStats/getHabitStatCards
 * are always called together (see stats-read.ts) with the same value. */
const getRecentHabitLogsByHabit = cache(async (today: string): Promise<Map<string, Map<string, string>>> => {
  const activeHabits = await getActiveHabits();
  const ids = activeHabits.map((h) => h.id);
  const from90 = addDays(today, -89);
  const logs = await logsSince(ids, from90);

  const byHabit = new Map<string, Map<string, string>>();
  for (const log of logs) {
    if (!byHabit.has(log.habitId)) byHabit.set(log.habitId, new Map());
    byHabit.get(log.habitId)!.set(log.date, log.status);
  }
  return byHabit;
});

function completionRatio(
  habit: HabitRow,
  logsByDate: Map<string, string>,
  from: string,
  to: string
): number {
  const start = habit.startDate > from ? habit.startDate : from;
  if (start > to) return 0;
  const applicable = dateRange(start, to).filter((d) => isDateApplicable(habit, d));
  if (applicable.length === 0) return 0;
  const overLimit = overLimitSkipDates(habit, applicable, logsByDate);
  const kept = applicable.filter((d) => keepsStreakOn(logsByDate.get(d), d, overLimit)).length;
  return Math.round((kept / applicable.length) * 100);
}

export type HabitStatCard = {
  habitId: string;
  name: string;
  pct7: number;
  pct30: number;
  pct90: number;
  currentStreak: number;
  longestStreak: number;
};

export async function getHabitStatCards(today: string): Promise<HabitStatCard[]> {
  const [activeHabits, byHabit] = await Promise.all([getActiveHabits(), getRecentHabitLogsByHabit(today)]);
  const ids = activeHabits.map((h) => h.id);
  const from90 = addDays(today, -89);
  const streaks = ids.length ? await db.select().from(habitStreaks).where(inArray(habitStreaks.habitId, ids)) : [];
  const streakByHabit = new Map(streaks.map((s) => [s.habitId, s]));

  return activeHabits.map((h) => {
    const habitLogsByDate = byHabit.get(h.id) ?? new Map();
    const streak = streakByHabit.get(h.id);
    return {
      habitId: h.id,
      name: h.name,
      pct7: completionRatio(h, habitLogsByDate, addDays(today, -6), today),
      pct30: completionRatio(h, habitLogsByDate, addDays(today, -29), today),
      pct90: completionRatio(h, habitLogsByDate, from90, today),
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
    };
  });
}

export async function getOverallStats(today: string) {
  const [activeHabits, byHabit] = await Promise.all([getActiveHabits(), getRecentHabitLogsByHabit(today)]);
  const from90 = addDays(today, -89);

  function avgRatio(from: string) {
    if (activeHabits.length === 0) return 0;
    const values = activeHabits.map((h) =>
      completionRatio(h, byHabit.get(h.id) ?? new Map(), from, today)
    );
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  return {
    pct7: avgRatio(addDays(today, -6)),
    pct30: avgRatio(addDays(today, -29)),
    pct90: avgRatio(from90),
  };
}

export type TrendPoint = { date: string; pct: number };

/** `days` must stay <= 90 — logs are read from the shared 90-day map above
 * (see getRecentHabitLogsByHabit), so a wider window would silently look
 * like a lower completion rate instead of erroring. Both current callers
 * (stats-read.ts) pass 14. */
export async function getTrend(today: string, days: number): Promise<TrendPoint[]> {
  const [activeHabits, byHabit] = await Promise.all([getActiveHabits(), getRecentHabitLogsByHabit(today)]);
  const from = addDays(today, -(days - 1));

  const overLimitByHabit = new Map<string, Set<string>>();
  for (const h of activeHabits) {
    const statusByDate = byHabit.get(h.id) ?? new Map();
    const applicable = dateRange(from, today).filter((d) => isDateApplicable(h, d) && h.startDate <= d);
    overLimitByHabit.set(h.id, overLimitSkipDates(h, applicable, statusByDate));
  }

  return dateRange(from, today).map((date) => {
    const applicable = activeHabits.filter((h) => isDateApplicable(h, date) && h.startDate <= date);
    if (applicable.length === 0) return { date, pct: 0 };
    const kept = applicable.filter((h) => {
      const statusByDate = byHabit.get(h.id) ?? new Map();
      const overLimit = overLimitByHabit.get(h.id)!;
      return keepsStreakOn(statusByDate.get(date), date, overLimit);
    }).length;
    return { date, pct: Math.round((kept / applicable.length) * 100) };
  });
}

export type CategoryStat = {
  categoryId: string;
  nameEs: string;
  nameEn: string;
  color: string;
  pct: number;
};

/** Same <= 90-day constraint as getTrend above. Both current callers
 * (stats-read.ts) pass 30. */
export async function getCategoryStats(today: string, days = 30): Promise<CategoryStat[]> {
  const userId = await getCurrentUserId();
  const [cats, activeHabits, byHabit] = await Promise.all([
    db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.sortOrder),
    getActiveHabits(),
    getRecentHabitLogsByHabit(today),
  ]);
  const from = addDays(today, -(days - 1));

  return cats
    .map((c) => {
      const habitsInCat = activeHabits.filter((h) => h.categoryId === c.id);
      if (habitsInCat.length === 0) return null;
      const values = habitsInCat.map((h) =>
        completionRatio(h, byHabit.get(h.id) ?? new Map(), from, today)
      );
      const pct = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      return { categoryId: c.id, nameEs: c.nameEs, nameEn: c.nameEn, color: c.color, pct };
    })
    .filter((c): c is CategoryStat => c !== null);
}
