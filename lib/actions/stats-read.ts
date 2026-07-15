"use server";

import { getCategoryStats, getHabitStatCards, getOverallStats, getTrend } from "@/lib/queries/stats";
import { getMoodCorrelation, getWorstWeekday } from "@/lib/queries/patterns";
import { getMonthSummary, getWeekSummary } from "@/lib/queries/summary";
import { getCrossDomainInsights } from "@/lib/queries/insights";
import { getCurrencyPreference } from "@/lib/queries/user";

/** Bundled to match the exact Promise.all in app/(dashboard)/stats/page.tsx.
 * `categories` here is CategoryStat[] (per-category completion stats), a
 * different shape from the shared habit CategoryRow[] behind
 * swrKeys.categories() — so it stays part of this route-specific bundle
 * rather than reusing that key. */
export async function fetchStatsAction(today: string) {
  const [overall, trend, categories, cards, weekSummary, monthSummary, worstWeekday, moodCorrelation, insights, currency] =
    await Promise.all([
      getOverallStats(today),
      getTrend(today, 14),
      getCategoryStats(today, 30),
      getHabitStatCards(today),
      getWeekSummary(today),
      getMonthSummary(today),
      getWorstWeekday(today),
      getMoodCorrelation(today),
      getCrossDomainInsights(today),
      getCurrencyPreference(),
    ]);
  return { overall, trend, categories, cards, weekSummary, monthSummary, worstWeekday, moodCorrelation, insights, currency };
}
