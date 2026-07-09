import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import {
  getFocusHabitBreakdown,
  getFocusMonthSummary,
  getFocusOverallTotals,
  getFocusStreak,
  getFocusTimeOfDayDistribution,
  getFocusTrend,
  getFocusWeekSummary,
} from "@/lib/queries/focus-stats";
import { FocusEstadisticasClient } from "./estadisticas-client";

export default async function EnfoqueEstadisticasPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

  const [overall, trend, weekSummary, monthSummary, habitBreakdown, timeOfDay, streak] = await Promise.all([
    getFocusOverallTotals(today),
    getFocusTrend(today, 14),
    getFocusWeekSummary(today),
    getFocusMonthSummary(today),
    getFocusHabitBreakdown(today, 30),
    getFocusTimeOfDayDistribution(today, 30),
    getFocusStreak(today),
  ]);

  return (
    <FocusEstadisticasClient
      overall={overall}
      trend={trend}
      weekSummary={weekSummary}
      monthSummary={monthSummary}
      habitBreakdown={habitBreakdown}
      timeOfDay={timeOfDay}
      streak={streak}
    />
  );
}
