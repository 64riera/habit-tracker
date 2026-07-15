"use server";

import { getFocusHistory } from "@/lib/queries/focus";
import { getFocusHistorySummary } from "@/lib/queries/focus-stats";

const PAGE_SIZE = 20;

export async function fetchFocusHistoryAction(habitId: string, categoryId: string) {
  const filters = { habitId: habitId || undefined, categoryId: categoryId || undefined };
  const [sessions, summary] = await Promise.all([
    getFocusHistory({ ...filters, limit: PAGE_SIZE }),
    getFocusHistorySummary(filters.habitId, filters.categoryId),
  ]);
  return { sessions, summary };
}

/**
 * Pages beyond the first (which `fetchFocusHistoryAction` above already
 * owns) for the "load more" list on /focus/history — `pageIndex` 0 here
 * means the *second* page overall (offset PAGE_SIZE), so this never
 * re-fetches or duplicates the rows `fetchFocusHistoryAction`'s `sessions`
 * already caches.
 */
export async function fetchFocusHistoryPageAction(habitId: string, categoryId: string, pageIndex: number) {
  const filters = { habitId: habitId || undefined, categoryId: categoryId || undefined };
  const sessions = await getFocusHistory({
    ...filters,
    limit: PAGE_SIZE,
    offset: PAGE_SIZE * (pageIndex + 1),
  });
  return { sessions };
}
