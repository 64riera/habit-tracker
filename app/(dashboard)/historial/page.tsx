import { getActiveHabits, getCategories } from "@/lib/queries/habits";
import { getCalendarMonth, getHeatmapRange, getRecentLog } from "@/lib/queries/history";
import { addDays, getTodayDateString, startOfMonth } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { HistorialClient } from "./historial-client";

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ habit?: string; category?: string; range?: string }>;
}) {
  const { habit: habitId, category: categoryId, range } = await searchParams;
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const rangeDays = range === "30" ? 30 : range === "365" ? 365 : 90;
  const filters = { habitId, categoryId };

  const [habits, categories, heatmap, calendar, log] = await Promise.all([
    getActiveHabits(today),
    getCategories(),
    getHeatmapRange(addDays(today, -(rangeDays - 1)), today, filters),
    getCalendarMonth(startOfMonth(today), today, filters),
    getRecentLog(20, filters),
  ]);

  return (
    <HistorialClient
      habits={habits}
      categories={categories}
      heatmap={heatmap}
      calendar={calendar}
      log={log}
      selectedHabit={habitId ?? ""}
      selectedCategory={categoryId ?? ""}
      selectedRange={String(rangeDays)}
      today={today}
    />
  );
}
