import { getFocusHistory } from "@/lib/queries/focus";
import { getFocusHistorySummary } from "@/lib/queries/focus-stats";
import { getCategories, getHabitNames } from "@/lib/queries/habits";
import { getServerToday } from "@/lib/settings/date-server";
import { FocusHistorialClient } from "./history-client";

const PAGE_SIZE = 20;

export default async function FocusHistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ habit?: string; category?: string }>;
}) {
  const { habit: habitId, category: categoryId } = await searchParams;
  const today = await getServerToday();

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
