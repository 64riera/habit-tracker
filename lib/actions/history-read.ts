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
