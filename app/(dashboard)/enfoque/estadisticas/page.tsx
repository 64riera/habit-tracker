import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
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
import { FocusEstadisticasClient } from "./estadisticas-client";

export default async function EnfoqueEstadisticasPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

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

  return (
    <FocusEstadisticasClient
      overall={overall}
      trend={trend}
      weekSummary={weekSummary}
      monthSummary={monthSummary}
      habitBreakdown={habitBreakdown}
      categoryBreakdown={categoryBreakdown}
      timeOfDaySamples={timeOfDaySamples}
      streak={streak}
    />
  );
}
