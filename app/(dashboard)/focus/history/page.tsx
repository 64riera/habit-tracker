import { getFocusHistory } from "@/lib/queries/focus";
import { getFocusHistorySummary } from "@/lib/queries/focus-stats";
import { getCategories, getHabitNames } from "@/lib/queries/habits";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { FocusHistorialClient } from "./history-client";

const PAGE_SIZE = 20;

export default async function FocusHistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ habit?: string; category?: string }>;
}) {
  const { habit: habitId, category: categoryId } = await searchParams;
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

  const [sessions, summary, habitNames, categories] = await Promise.all([
    getFocusHistory({ habitId, categoryId, limit: PAGE_SIZE }),
    getFocusHistorySummary(habitId, categoryId),
    getHabitNames(),
    getCategories(),
  ]);

  return (
    <FocusHistorialClient
      sessions={sessions}
      summary={summary}
      habitNames={habitNames}
      categories={categories}
      today={today}
      selectedHabit={habitId ?? ""}
      selectedCategory={categoryId ?? ""}
    />
  );
}
