import { getActiveHabits, getCategories } from "@/lib/queries/habits";
import { getCalendarMonth, getHeatmapRange, getRecentLog } from "@/lib/queries/history";
import { addDays, startOfMonth } from "@/lib/date";
import { getServerToday } from "@/lib/settings/date-server";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { HistorialClient } from "./history-client";

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ habit?: string; category?: string; range?: string }>;
}) {
  const [{ habit: habitId, category: categoryId, range }, today] = await Promise.all([searchParams, getServerToday()]);
  const rangeDays = range === "30" ? 30 : range === "365" ? 365 : 90;
  const filters = { habitId, categoryId };

  const [habits, categories, heatmap, calendar, log, focusHeader] = await Promise.all([
    getActiveHabits(today),
    getCategories(),
    getHeatmapRange(addDays(today, -(rangeDays - 1)), today, filters),
    getCalendarMonth(startOfMonth(today), today, filters),
    getRecentLog(20, filters),
    getFocusHeaderData(),
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
      focusHeader={focusHeader}
    />
  );
}
