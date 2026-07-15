"use server";

import { getActiveHabits } from "@/lib/queries/habits";
import { getCalendarMonth, getHeatmapRange, getRecentLog } from "@/lib/queries/history";
import { addDays, startOfMonth } from "@/lib/date";

/** Bundled to match the exact Promise.all in app/(dashboard)/history/page.tsx
 * — all four pieces share the same filters and are always fetched/invalidated
 * together for a given (today, habitId, categoryId, rangeDays) combination. */
export async function fetchHistoryAction(today: string, habitId: string, categoryId: string, rangeDays: number) {
  const filters = { habitId: habitId || undefined, categoryId: categoryId || undefined };
  const [habits, heatmap, calendar, log] = await Promise.all([
    getActiveHabits(today),
    getHeatmapRange(addDays(today, -(rangeDays - 1)), today, filters),
    getCalendarMonth(startOfMonth(today), today, filters),
    getRecentLog(20, filters),
  ]);
  return { habits, heatmap, calendar, log };
}

const LOG_PAGE_SIZE = 20;

/**
 * Pages beyond the first (which `fetchHistoryAction` above already owns) for
 * the "load more" list on /history — `pageIndex` 0 here means the *second*
 * page overall (offset 20), so this never re-fetches or duplicates the rows
 * `fetchHistoryAction`'s `log` already caches.
 */
export async function fetchLogPageAction(habitId: string, categoryId: string, pageIndex: number) {
  const filters = { habitId: habitId || undefined, categoryId: categoryId || undefined };
  const log = await getRecentLog(LOG_PAGE_SIZE, filters, LOG_PAGE_SIZE * (pageIndex + 1));
  return { log };
}
