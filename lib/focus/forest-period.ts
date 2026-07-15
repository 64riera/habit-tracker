import { dateRange, monthKey } from "@/lib/date";
import { treeSizeForSessionMinutes, type TreeSize } from "@/lib/focus/rewards";
import type { FocusTrendPoint } from "@/lib/queries/focus-stats";
import type { DayCell } from "@/lib/queries/history";

export type PeriodTree = { id: string; date: string; minutes: number; size: TreeSize };

/** One tree per completed session — `startedAt` (already unique per session
 * and already selected by every caller) doubles as the id instead of
 * widening the shared `sessionsInDateRange` select just for a React key. */
export function buildPeriodTrees(
  sessions: { startedAt: string; date: string; accumulatedActiveSeconds: number }[]
): PeriodTree[] {
  return sessions.map((s) => {
    const minutes = Math.round(s.accumulatedActiveSeconds / 60);
    return { id: s.startedAt, date: s.date, minutes, size: treeSizeForSessionMinutes(minutes) };
  });
}

/** Zero-filled day-by-day trend, same shape as `getFocusTrend` but computed
 * from rows the caller already fetched for the same range (the tree grid
 * needs the same rows), instead of a second query. */
export function dailyTrendFromSessions(
  sessions: { date: string; accumulatedActiveSeconds: number }[],
  from: string,
  to: string
): FocusTrendPoint[] {
  const minutesByDate = new Map<string, number>();
  for (const s of sessions) {
    minutesByDate.set(s.date, (minutesByDate.get(s.date) ?? 0) + s.accumulatedActiveSeconds / 60);
  }
  return dateRange(from, to).map((date) => ({ date, minutes: Math.round(minutesByDate.get(date) ?? 0) }));
}

function monthsInRange(from: string, to: string): string[] {
  const months: string[] = [];
  let cursor = monthKey(from);
  const last = monthKey(to);
  while (cursor <= last) {
    months.push(cursor);
    const [y, m] = cursor.split("-").map(Number);
    const next = new Date(y, m, 1); // m is 1-indexed already => next month
    cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }
  return months;
}

/** Groups already-daily-aggregated totals into 12 (or fewer) monthly points
 * for the year view — no new query, just a reduction over the same rows the
 * heatmap uses. */
export function monthlyTrendFromDaily(
  dailyTotals: { date: string; minutes: number }[],
  from: string,
  to: string
): { monthKey: string; minutes: number }[] {
  const minutesByMonth = new Map<string, number>();
  for (const d of dailyTotals) {
    minutesByMonth.set(monthKey(d.date), (minutesByMonth.get(monthKey(d.date)) ?? 0) + d.minutes);
  }
  return monthsInRange(from, to).map((mk) => ({ monthKey: mk, minutes: Math.round(minutesByMonth.get(mk) ?? 0) }));
}

/** Same ratio-of-goal bucketing scheme as `getHeatmapRange` (1 / 0.66 / 0.33
 * thresholds -> levels 4/3/2/1/0), applied to minutes-focused-that-day vs.
 * the daily goal instead of % of habits kept — reuses the `DayCell` type so
 * the existing <Heatmap> component renders it without any changes. */
export function yearHeatmapCells(
  dailyTotals: Map<string, number>,
  from: string,
  to: string,
  goalMinutes: number
): DayCell[] {
  return dateRange(from, to).map((date) => {
    const minutes = dailyTotals.get(date) ?? 0;
    const ratio = goalMinutes > 0 ? minutes / goalMinutes : minutes > 0 ? 1 : 0;
    let level: DayCell["level"] = 0;
    if (ratio >= 1) level = 4;
    else if (ratio >= 0.66) level = 3;
    else if (ratio >= 0.33) level = 2;
    else if (ratio > 0) level = 1;
    return { date, level, allJustified: false };
  });
}
