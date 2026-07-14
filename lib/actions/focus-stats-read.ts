"use server";

import {
  getFocusCategoryBreakdown,
  getFocusHabitBreakdown,
  getFocusMonthSummary,
  getFocusOverallTotals,
  getFocusStreak,
  getFocusTimeOfDaySamples,
  getFocusTrend,
  getFocusWeekSummary,
} from "@/lib/queries/focus-stats";

/** Bundled to match the exact Promise.all in app/(dashboard)/focus/stats/page.tsx. */
export async function fetchFocusStatsAction(today: string) {
  const [overall, trend, weekSummary, monthSummary, habitBreakdown, categoryBreakdown, timeOfDaySamples, streak] =
    await Promise.all([
      getFocusOverallTotals(today),
      getFocusTrend(today, 14),
      getFocusWeekSummary(today),
      getFocusMonthSummary(today),
      getFocusHabitBreakdown(today, 30),
      getFocusCategoryBreakdown(today, 30),
      getFocusTimeOfDaySamples(today, 30),
      getFocusStreak(today),
    ]);
  return { overall, trend, weekSummary, monthSummary, habitBreakdown, categoryBreakdown, timeOfDaySamples, streak };
}
