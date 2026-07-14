import { getAllHabitsForManagement, getCategories } from "@/lib/queries/habits";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { HabitosClient } from "./habits-client";

export default async function HabitosPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const [habits, categories, focusHeader] = await Promise.all([
    getAllHabitsForManagement(today),
    getCategories(),
    getFocusHeaderData(),
  ]);

  return <HabitosClient habits={habits} categories={categories} focusHeader={focusHeader} today={today} />;
}
