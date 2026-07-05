import { getAllHabitsForManagement, getCategories } from "@/lib/queries/habits";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { HabitosClient } from "./habitos-client";

export default async function HabitosPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const [habits, categories] = await Promise.all([
    getAllHabitsForManagement(today),
    getCategories(),
  ]);

  return <HabitosClient habits={habits} categories={categories} />;
}
