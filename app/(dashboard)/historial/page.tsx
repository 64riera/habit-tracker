import { getActiveHabits } from "@/lib/queries/habits";
import { getCalendarMonth, getHeatmapRange, getRecentLog } from "@/lib/queries/history";
import { addDays, getTodayDateString, startOfMonth } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { HistorialClient } from "./historial-client";

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ habit?: string }>;
}) {
  const { habit: habitId } = await searchParams;
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

  const [habits, heatmap, calendar, log] = await Promise.all([
    getActiveHabits(today),
    getHeatmapRange(addDays(today, -139), today, habitId),
    getCalendarMonth(startOfMonth(today), today, habitId),
    getRecentLog(20, habitId),
  ]);

  return (
    <HistorialClient
      habits={habits}
      heatmap={heatmap}
      calendar={calendar}
      log={log}
      selectedHabit={habitId ?? ""}
      today={today}
    />
  );
}
