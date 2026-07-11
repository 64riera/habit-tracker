import "server-only";
import { and, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, focusSessions, habits } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { addDays, dateRange, startOfMonth, startOfWeek } from "@/lib/date";
import { computeFocusStreak } from "@/lib/focus/streak";
import { getFocusSettings } from "@/lib/queries/focus";

/**
 * Focus aggregation/trend queries, separated from the session lifecycle
 * queries in `lib/queries/focus.ts` — same split that already exists between
 * `stats.ts`/`summary.ts`/`patterns.ts` for habits. Everything is computed
 * on the fly from `focusSessions` (no rollup table): at this scale that's
 * consistent with the rest of the codebase and avoids extra maintenance.
 */

async function sessionsInDateRange(userId: string, from: string, to: string) {
  return db
    .select({
      habitId: focusSessions.habitId,
      status: focusSessions.status,
      date: focusSessions.date,
      startedAt: focusSessions.startedAt,
      accumulatedActiveSeconds: focusSessions.accumulatedActiveSeconds,
    })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.date, from),
        lte(focusSessions.date, to),
        inArray(focusSessions.status, ["completed", "cancelled"])
      )
    );
}

export type FocusOverallTotals = { minutes7: number; minutes30: number; minutes90: number };

/** A single 90-day fetch, same as `getOverallStats` for habits — the 7/30
 * day windows are filtered in memory instead of running three separate
 * queries. */
export async function getFocusOverallTotals(today: string): Promise<FocusOverallTotals> {
  const userId = await getCurrentUserId();
  const from90 = addDays(today, -89);
  const from30 = addDays(today, -29);
  const from7 = addDays(today, -6);
  const rows = await db
    .select({ date: focusSessions.date, accumulatedActiveSeconds: focusSessions.accumulatedActiveSeconds })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.date, from90),
        lte(focusSessions.date, today),
        eq(focusSessions.status, "completed")
      )
    );

  let seconds7 = 0;
  let seconds30 = 0;
  let seconds90 = 0;
  for (const r of rows) {
    seconds90 += r.accumulatedActiveSeconds;
    if (r.date >= from30) seconds30 += r.accumulatedActiveSeconds;
    if (r.date >= from7) seconds7 += r.accumulatedActiveSeconds;
  }
  return {
    minutes7: Math.round(seconds7 / 60),
    minutes30: Math.round(seconds30 / 60),
    minutes90: Math.round(seconds90 / 60),
  };
}

export type FocusTrendPoint = { date: string; minutes: number };

export async function getFocusTrend(today: string, days = 14): Promise<FocusTrendPoint[]> {
  const userId = await getCurrentUserId();
  const from = addDays(today, -(days - 1));
  const rows = await sessionsInDateRange(userId, from, today);

  const minutesByDate = new Map<string, number>();
  for (const r of rows) {
    if (r.status !== "completed") continue;
    minutesByDate.set(r.date, (minutesByDate.get(r.date) ?? 0) + r.accumulatedActiveSeconds / 60);
  }
  return dateRange(from, today).map((date) => ({ date, minutes: Math.round(minutesByDate.get(date) ?? 0) }));
}

export type FocusPeriodSummary = {
  from: string;
  to: string;
  totalMinutes: number;
  sessionCount: number;
  completedCount: number;
  cancelledCount: number;
  completionRatePct: number;
  avgSessionMinutes: number;
  longestSessionMinutes: number;
};

export type FocusPeriodComparison = {
  current: FocusPeriodSummary;
  previous: FocusPeriodSummary;
  minutesChange: number;
};

async function computeFocusPeriodSummary(userId: string, from: string, to: string): Promise<FocusPeriodSummary> {
  const rows = await sessionsInDateRange(userId, from, to);
  const completed = rows.filter((r) => r.status === "completed");
  const totalSeconds = completed.reduce((sum, r) => sum + r.accumulatedActiveSeconds, 0);
  const longestSeconds = completed.reduce((max, r) => Math.max(max, r.accumulatedActiveSeconds), 0);

  return {
    from,
    to,
    totalMinutes: Math.round(totalSeconds / 60),
    sessionCount: rows.length,
    completedCount: completed.length,
    cancelledCount: rows.length - completed.length,
    completionRatePct: rows.length > 0 ? Math.round((completed.length / rows.length) * 100) : 0,
    avgSessionMinutes: completed.length > 0 ? Math.round(totalSeconds / completed.length / 60) : 0,
    longestSessionMinutes: Math.round(longestSeconds / 60),
  };
}

export async function getFocusWeekSummary(today: string): Promise<FocusPeriodComparison> {
  const userId = await getCurrentUserId();
  const weekStart = startOfWeek(today);
  const current = await computeFocusPeriodSummary(userId, weekStart, today);
  const prevWeekEnd = addDays(weekStart, -1);
  const prevWeekStart = startOfWeek(prevWeekEnd);
  const previous = await computeFocusPeriodSummary(userId, prevWeekStart, prevWeekEnd);
  return { current, previous, minutesChange: current.totalMinutes - previous.totalMinutes };
}

export async function getFocusMonthSummary(today: string): Promise<FocusPeriodComparison> {
  const userId = await getCurrentUserId();
  const monthStart = startOfMonth(today);
  const current = await computeFocusPeriodSummary(userId, monthStart, today);
  const prevMonthEnd = addDays(monthStart, -1);
  const prevMonthStart = startOfMonth(prevMonthEnd);
  const previous = await computeFocusPeriodSummary(userId, prevMonthStart, prevMonthEnd);
  return { current, previous, minutesChange: current.totalMinutes - previous.totalMinutes };
}

export type FocusHabitStat = { habitId: string; habitName: string; totalMinutes: number; sessionCount: number };

export async function getFocusHabitBreakdown(today: string, days = 30): Promise<FocusHabitStat[]> {
  const userId = await getCurrentUserId();
  const from = addDays(today, -(days - 1));
  const rows = await db
    .select({ habitId: focusSessions.habitId, accumulatedActiveSeconds: focusSessions.accumulatedActiveSeconds })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.date, from),
        lte(focusSessions.date, today),
        eq(focusSessions.status, "completed"),
        isNotNull(focusSessions.habitId)
      )
    );

  const byHabit = new Map<string, { totalSeconds: number; sessionCount: number }>();
  for (const r of rows) {
    const habitId = r.habitId!;
    const entry = byHabit.get(habitId) ?? { totalSeconds: 0, sessionCount: 0 };
    entry.totalSeconds += r.accumulatedActiveSeconds;
    entry.sessionCount += 1;
    byHabit.set(habitId, entry);
  }
  if (byHabit.size === 0) return [];

  const habitRows = await db
    .select({ id: habits.id, name: habits.name })
    .from(habits)
    .where(inArray(habits.id, [...byHabit.keys()]));
  const nameById = new Map(habitRows.map((h) => [h.id, h.name]));

  return [...byHabit.entries()]
    .map(([habitId, v]) => ({
      habitId,
      habitName: nameById.get(habitId) ?? habitId,
      totalMinutes: Math.round(v.totalSeconds / 60),
      sessionCount: v.sessionCount,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export type FocusCategoryStat = {
  categoryId: string;
  nameEs: string;
  nameEn: string;
  color: string;
  totalMinutes: number;
  sessionCount: number;
};

/** Same two-step pattern as getFocusHabitBreakdown: aggregates in memory
 * by categoryId and then resolves name/color in a single separate query,
 * instead of a join — this way the aggregate doesn't need to bring back a
 * category row for every session. */
export async function getFocusCategoryBreakdown(today: string, days = 30): Promise<FocusCategoryStat[]> {
  const userId = await getCurrentUserId();
  const from = addDays(today, -(days - 1));
  const rows = await db
    .select({ categoryId: focusSessions.categoryId, accumulatedActiveSeconds: focusSessions.accumulatedActiveSeconds })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.date, from),
        lte(focusSessions.date, today),
        eq(focusSessions.status, "completed"),
        isNotNull(focusSessions.categoryId)
      )
    );

  const byCategory = new Map<string, { totalSeconds: number; sessionCount: number }>();
  for (const r of rows) {
    const categoryId = r.categoryId!;
    const entry = byCategory.get(categoryId) ?? { totalSeconds: 0, sessionCount: 0 };
    entry.totalSeconds += r.accumulatedActiveSeconds;
    entry.sessionCount += 1;
    byCategory.set(categoryId, entry);
  }
  if (byCategory.size === 0) return [];

  const categoryRows = await db
    .select({ id: categories.id, nameEs: categories.nameEs, nameEn: categories.nameEn, color: categories.color })
    .from(categories)
    .where(inArray(categories.id, [...byCategory.keys()]));
  const byId = new Map(categoryRows.map((c) => [c.id, c]));

  return [...byCategory.entries()]
    .map(([categoryId, v]) => {
      const cat = byId.get(categoryId);
      return {
        categoryId,
        nameEs: cat?.nameEs ?? categoryId,
        nameEn: cat?.nameEn ?? categoryId,
        color: cat?.color ?? "var(--color-muted)",
        totalMinutes: Math.round(v.totalSeconds / 60),
        sessionCount: v.sessionCount,
      };
    })
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export type FocusTimeOfDaySample = { startedAt: string; minutes: number };

/**
 * Returns raw samples (not bucketed): the time-of-day slot for each session
 * depends on the local time of the browser of whoever is looking at the
 * screen, not the server's — Vercel runs on UTC, so bucketing here (with
 * `Date.getHours()` on the server) would misalign this stat against the
 * time History already shows correctly (which is computed on the client).
 * Bucketing via `bucketHourOfDay` is done in the client component, over
 * `new Date(startedAt).getHours()` evaluated in the browser.
 */
export async function getFocusTimeOfDaySamples(today: string, days = 30): Promise<FocusTimeOfDaySample[]> {
  const userId = await getCurrentUserId();
  const from = addDays(today, -(days - 1));
  const rows = await db
    .select({ startedAt: focusSessions.startedAt, accumulatedActiveSeconds: focusSessions.accumulatedActiveSeconds })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.date, from),
        lte(focusSessions.date, today),
        eq(focusSessions.status, "completed")
      )
    );

  return rows.map((r) => ({ startedAt: r.startedAt, minutes: r.accumulatedActiveSeconds / 60 }));
}

export type FocusHistorySummary = { totalMinutes: number; sessionCount: number; completionRatePct: number };

/** Summary strip for /focus/history: totals over the entire history
 * (not bounded by date, only by the habit filter if there is one) — a
 * single query aggregated in SQL instead of fetching every row, because
 * here it can indeed grow without the 90-day cap the other queries use. */
export async function getFocusHistorySummary(habitId?: string, categoryId?: string): Promise<FocusHistorySummary> {
  const userId = await getCurrentUserId();
  const conditions = [eq(focusSessions.userId, userId), inArray(focusSessions.status, ["completed", "cancelled"])];
  if (habitId) conditions.push(eq(focusSessions.habitId, habitId));
  if (categoryId) conditions.push(eq(focusSessions.categoryId, categoryId));

  const [row] = await db
    .select({
      totalSeconds: sql<number>`coalesce(sum(case when ${focusSessions.status} = 'completed' then ${focusSessions.accumulatedActiveSeconds} else 0 end), 0)`,
      completedCount: sql<number>`coalesce(sum(case when ${focusSessions.status} = 'completed' then 1 else 0 end), 0)`,
      sessionCount: sql<number>`count(*)`,
    })
    .from(focusSessions)
    .where(and(...conditions));

  const sessionCount = Number(row?.sessionCount ?? 0);
  const completedCount = Number(row?.completedCount ?? 0);
  return {
    totalMinutes: Math.round(Number(row?.totalSeconds ?? 0) / 60),
    sessionCount,
    completionRatePct: sessionCount > 0 ? Math.round((completedCount / sessionCount) * 100) : 0,
  };
}

const STREAK_LOOKBACK_DAYS = 120;

export async function getFocusStreak(today: string): Promise<{ current: number; longest: number }> {
  const userId = await getCurrentUserId();
  const from = addDays(today, -(STREAK_LOOKBACK_DAYS - 1));
  const [rows, settings] = await Promise.all([
    db
      .select({ date: focusSessions.date, accumulatedActiveSeconds: focusSessions.accumulatedActiveSeconds })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          gte(focusSessions.date, from),
          lte(focusSessions.date, today),
          eq(focusSessions.status, "completed")
        )
      ),
    getFocusSettings(),
  ]);

  const minutesByDate = new Map<string, number>();
  for (const r of rows) {
    minutesByDate.set(r.date, (minutesByDate.get(r.date) ?? 0) + r.accumulatedActiveSeconds / 60);
  }
  return computeFocusStreak(minutesByDate, settings.dailyGoalMinutes, today);
}
