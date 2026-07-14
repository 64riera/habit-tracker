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
