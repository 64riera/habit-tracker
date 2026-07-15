import "server-only";
import { cache } from "react";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { focusSessions } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { addDays, startOfMonth, startOfWeek, startOfYear } from "@/lib/date";
import { buildPeriodTrees, dailyTrendFromSessions, monthlyTrendFromDaily, yearHeatmapCells, type PeriodTree } from "@/lib/focus/forest-period";
import { computeFocusPeriodSummary, sessionsInDateRange, type FocusTrendPoint } from "@/lib/queries/focus-stats";
import { getFocusRewardProgress, getFocusSettings, type FocusRewardProgress } from "@/lib/queries/focus";
import type { DayCell } from "@/lib/queries/history";
import { percentDelta } from "@/lib/format/delta";

/**
 * Everything `/focus/forest` needs, bundled into one query (same "one
 * Promise.all per page" convention as `fetchFocusStatsAction`) so switching
 * between the week/month/year/total tabs client-side never refetches.
 */

export type ForestPeriodData = {
  from: string;
  to: string;
  trees: PeriodTree[];
  trend: FocusTrendPoint[];
  totalMinutes: number;
  sessionCount: number;
  activeDays: number;
  /** null when the previous period had 0 minutes — avoids Infinity/NaN. */
  minutesChangePct: number | null;
};

export type ForestYearData = {
  from: string;
  to: string;
  heatmap: DayCell[];
  monthlyTrend: { monthKey: string; minutes: number }[];
  totalMinutes: number;
  sessionCount: number;
  activeDays: number;
  minutesChangePct: number | null;
};

export type ForestTotalData = FocusRewardProgress;

export type FocusForestData = {
  week: ForestPeriodData;
  month: ForestPeriodData;
  year: ForestYearData;
  total: ForestTotalData;
};

async function dailyAggregatedRange(
  userId: string,
  from: string,
  to: string
): Promise<{ date: string; minutes: number; sessionCount: number }[]> {
  const rows = await db
    .select({
      date: focusSessions.date,
      totalSeconds: sql<number>`coalesce(sum(${focusSessions.accumulatedActiveSeconds}), 0)`,
      sessionCount: sql<number>`count(*)`,
    })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.date, from),
        lte(focusSessions.date, to),
        eq(focusSessions.status, "completed")
      )
    )
    .groupBy(focusSessions.date);
  return rows.map((r) => ({
    date: r.date,
    minutes: Math.round(Number(r.totalSeconds) / 60),
    sessionCount: Number(r.sessionCount),
  }));
}

function buildPeriodData(
  from: string,
  to: string,
  sessions: { startedAt: string; date: string; status: string; accumulatedActiveSeconds: number }[],
  previousTotalMinutes: number
): ForestPeriodData {
  const completed = sessions.filter((s) => s.status === "completed");
  const totalMinutes = Math.round(completed.reduce((sum, s) => sum + s.accumulatedActiveSeconds, 0) / 60);
  const activeDays = new Set(completed.map((s) => s.date)).size;
  return {
    from,
    to,
    trees: buildPeriodTrees(completed),
    trend: dailyTrendFromSessions(completed, from, to),
    totalMinutes,
    sessionCount: completed.length,
    activeDays,
    minutesChangePct: percentDelta(previousTotalMinutes, totalMinutes),
  };
}

export const getFocusForestData = cache(async (today: string): Promise<FocusForestData> => {
  const userId = await getCurrentUserId();

  const weekStart = startOfWeek(today);
  const prevWeekEnd = addDays(weekStart, -1);
  const prevWeekStart = startOfWeek(prevWeekEnd);

  const monthStart = startOfMonth(today);
  const prevMonthEnd = addDays(monthStart, -1);
  const prevMonthStart = startOfMonth(prevMonthEnd);

  const yearStart = startOfYear(today);
  const prevYearEnd = addDays(yearStart, -1);
  const prevYearStart = startOfYear(prevYearEnd);

  const [weekRows, monthRows, yearDaily, prevWeek, prevMonth, prevYear, settings, rewardProgress] = await Promise.all([
    sessionsInDateRange(userId, weekStart, today),
    sessionsInDateRange(userId, monthStart, today),
    dailyAggregatedRange(userId, yearStart, today),
    computeFocusPeriodSummary(userId, prevWeekStart, prevWeekEnd),
    computeFocusPeriodSummary(userId, prevMonthStart, prevMonthEnd),
    computeFocusPeriodSummary(userId, prevYearStart, prevYearEnd),
    getFocusSettings(),
    getFocusRewardProgress(),
  ]);

  const yearTotalMinutes = yearDaily.reduce((sum, d) => sum + d.minutes, 0);
  const yearActiveDays = yearDaily.filter((d) => d.minutes > 0).length;
  const yearSessionCount = yearDaily.reduce((sum, d) => sum + d.sessionCount, 0);

  const dailyTotalsMap = new Map(yearDaily.map((d) => [d.date, d.minutes]));

  const year: ForestYearData = {
    from: yearStart,
    to: today,
    heatmap: yearHeatmapCells(dailyTotalsMap, yearStart, today, settings.dailyGoalMinutes),
    monthlyTrend: monthlyTrendFromDaily(yearDaily, yearStart, today),
    totalMinutes: yearTotalMinutes,
    sessionCount: yearSessionCount,
    activeDays: yearActiveDays,
    minutesChangePct: percentDelta(prevYear.totalMinutes, yearTotalMinutes),
  };

  return {
    week: buildPeriodData(weekStart, today, weekRows, prevWeek.totalMinutes),
    month: buildPeriodData(monthStart, today, monthRows, prevMonth.totalMinutes),
    year,
    total: rewardProgress,
  };
});
