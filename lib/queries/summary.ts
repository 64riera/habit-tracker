import "server-only";
import { cache } from "react";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habitLogs, habitStreaks, habits } from "@/lib/db/schema";
import { addDays, dateRange, startOfMonth, startOfWeek } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";
import { overLimitSkipDates, keepsStreakOn } from "@/lib/habits/status";
import { getCurrentUserId } from "@/lib/auth/session";

export type PeriodSummary = {
  from: string;
  to: string;
  completed: number;
  missed: number;
  totalApplicable: number;
  pct: number;
  bestStreak: { habitId: string; name: string; streak: number } | null;
};

async function computePeriodSummary(from: string, to: string, habitId?: string): Promise<PeriodSummary> {
  const userId = await getCurrentUserId();
  const activeHabits = habitId
    ? await db.select().from(habits).where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    : await db.select().from(habits).where(and(eq(habits.userId, userId), eq(habits.status, "active")));
  const ids = activeHabits.map((h) => h.id);
  const logs = ids.length
    ? await db
        .select({ habitId: habitLogs.habitId, date: habitLogs.date, status: habitLogs.status })
        .from(habitLogs)
        .where(and(inArray(habitLogs.habitId, ids), gte(habitLogs.date, from), lte(habitLogs.date, to)))
    : [];

  const byHabit = new Map<string, Map<string, string>>();
  for (const log of logs) {
    if (!byHabit.has(log.habitId)) byHabit.set(log.habitId, new Map());
    byHabit.get(log.habitId)!.set(log.date, log.status);
  }

  let completed = 0;
  let missed = 0;
  let totalApplicable = 0;

  for (const h of activeHabits) {
    const start = h.startDate > from ? h.startDate : from;
    if (start > to) continue;
    const statusByDate = byHabit.get(h.id) ?? new Map();
    const applicable = dateRange(start, to).filter((d) => isDateApplicable(h, d));
    if (applicable.length === 0) continue;
    const overLimit = overLimitSkipDates(h, applicable, statusByDate);
    for (const date of applicable) {
      totalApplicable += 1;
      if (keepsStreakOn(statusByDate.get(date), date, overLimit)) completed += 1;
      else missed += 1;
    }
  }

  const streaks = ids.length ? await db.select().from(habitStreaks).where(inArray(habitStreaks.habitId, ids)) : [];
  let bestStreak: PeriodSummary["bestStreak"] = null;
  for (const s of streaks) {
    if (s.currentStreak <= 0) continue;
    if (!bestStreak || s.currentStreak > bestStreak.streak) {
      const h = activeHabits.find((x) => x.id === s.habitId);
      if (h) bestStreak = { habitId: h.id, name: h.name, streak: s.currentStreak };
    }
  }

  const pct = totalApplicable ? Math.round((completed / totalApplicable) * 100) : 0;
  return { from, to, completed, missed, totalApplicable, pct, bestStreak };
}

export type PeriodComparison = { current: PeriodSummary; previous: PeriodSummary; pctChange: number };

export const getWeekSummary = cache(async (today: string): Promise<PeriodComparison> => {
  const weekStart = startOfWeek(today);
  const current = await computePeriodSummary(weekStart, today);
  const prevWeekEnd = addDays(weekStart, -1);
  const prevWeekStart = startOfWeek(prevWeekEnd);
  const previous = await computePeriodSummary(prevWeekStart, prevWeekEnd);
  return { current, previous, pctChange: current.pct - previous.pct };
});

export const getMonthSummary = cache(async (today: string): Promise<PeriodComparison> => {
  const monthStart = startOfMonth(today);
  const current = await computePeriodSummary(monthStart, today);
  const prevMonthEnd = addDays(monthStart, -1);
  const prevMonthStart = startOfMonth(prevMonthEnd);
  const previous = await computePeriodSummary(prevMonthStart, prevMonthEnd);
  return { current, previous, pctChange: current.pct - previous.pct };
});

export const getHabitMonthSummary = cache(async (habitId: string, today: string): Promise<PeriodComparison> => {
  const monthStart = startOfMonth(today);
  const current = await computePeriodSummary(monthStart, today, habitId);
  const prevMonthEnd = addDays(monthStart, -1);
  const prevMonthStart = startOfMonth(prevMonthEnd);
  const previous = await computePeriodSummary(prevMonthStart, prevMonthEnd, habitId);
  return { current, previous, pctChange: current.pct - previous.pct };
});

export type BestMonthCheck = { currentPct: number; monthStart: string; isBestSoFar: boolean } | null;

const MIN_DAYS_ELAPSED_TO_COMPARE = 5;

/** Is the current month (so far) the habit's best completion month yet? */
export const getBestMonthCheck = cache(async (habitId: string, today: string): Promise<BestMonthCheck> => {
  const userId = await getCurrentUserId();
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1);
  if (!habit) return null;

  const currentMonthStart = startOfMonth(today);
  if (dateRange(currentMonthStart, today).length < MIN_DAYS_ELAPSED_TO_COMPARE) return null;
  if (currentMonthStart < habit.startDate) return null;

  const logs = await db
    .select({ date: habitLogs.date, status: habitLogs.status })
    .from(habitLogs)
    .where(eq(habitLogs.habitId, habitId));
  const statusByDate = new Map(logs.map((l) => [l.date, l.status]));

  const fullHistory = dateRange(habit.startDate, today).filter((d) => isDateApplicable(habit, d));
  const overLimit = overLimitSkipDates(habit, fullHistory, statusByDate);

  function pctFor(from: string, to: string): number | null {
    const applicable = dateRange(from, to).filter((d) => isDateApplicable(habit, d));
    if (applicable.length === 0) return null;
    const kept = applicable.filter((d) => keepsStreakOn(statusByDate.get(d), d, overLimit)).length;
    return Math.round((kept / applicable.length) * 100);
  }

  const currentPct = pctFor(currentMonthStart, today) ?? 0;

  let bestPrev = -1;
  let cursorEnd = addDays(currentMonthStart, -1);
  while (cursorEnd >= habit.startDate) {
    const cursorStart = startOfMonth(cursorEnd) < habit.startDate ? habit.startDate : startOfMonth(cursorEnd);
    const pct = pctFor(cursorStart, cursorEnd);
    if (pct !== null) bestPrev = Math.max(bestPrev, pct);
    cursorEnd = addDays(cursorStart, -1);
  }

  if (bestPrev < 0) return null;
  return { currentPct, monthStart: currentMonthStart, isBestSoFar: currentPct > bestPrev };
});
