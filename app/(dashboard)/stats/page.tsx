import { getServerToday } from "@/lib/settings/date-server";
import { getCategoryStats, getHabitStatCards, getOverallStats, getTrend } from "@/lib/queries/stats";
import { getMoodCorrelation, getWorstWeekday } from "@/lib/queries/patterns";
import { getMonthSummary, getWeekSummary } from "@/lib/queries/summary";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { getCrossDomainInsights } from "@/lib/queries/insights";
import { getCurrencyPreference } from "@/lib/queries/user";
import { EstadisticasClient } from "./stats-client";

export default async function EstadisticasPage() {
  const today = await getServerToday();

  const [
    overall,
    trend,
    categories,
    cards,
    weekSummary,
    monthSummary,
    worstWeekday,
    moodCorrelation,
    focusHeader,
    insights,
    currency,
  ] = await Promise.all([
    getOverallStats(today),
    getTrend(today, 14),
    getCategoryStats(today, 30),
    getHabitStatCards(today),
    getWeekSummary(today),
    getMonthSummary(today),
    getWorstWeekday(today),
    getMoodCorrelation(today),
    getFocusHeaderData(),
    getCrossDomainInsights(today),
    getCurrencyPreference(),
  ]);

  return (
    <EstadisticasClient
      overall={overall}
      trend={trend}
      categories={categories}
      cards={cards}
      weekSummary={weekSummary}
      monthSummary={monthSummary}
      worstWeekday={worstWeekday}
      moodCorrelation={moodCorrelation}
      focusHeader={focusHeader}
      insights={insights}
      currency={currency}
      today={today}
    />
  );
}
