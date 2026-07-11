import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { getCategoryStats, getHabitStatCards, getOverallStats, getTrend } from "@/lib/queries/stats";
import { getMoodCorrelation, getWorstWeekday } from "@/lib/queries/patterns";
import { getMonthSummary, getWeekSummary } from "@/lib/queries/summary";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { EstadisticasClient } from "./stats-client";

export default async function EstadisticasPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

  const [overall, trend, categories, cards, weekSummary, monthSummary, worstWeekday, moodCorrelation, focusHeader] =
    await Promise.all([
      getOverallStats(today),
      getTrend(today, 14),
      getCategoryStats(today, 30),
      getHabitStatCards(today),
      getWeekSummary(today),
      getMonthSummary(today),
      getWorstWeekday(today),
      getMoodCorrelation(today),
      getFocusHeaderData(),
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
    />
  );
}
