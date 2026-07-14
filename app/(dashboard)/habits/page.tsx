import { getAllHabitsForManagement, getCategories } from "@/lib/queries/habits";
import { getServerToday } from "@/lib/settings/date-server";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { HabitosClient } from "./habits-client";

export default async function HabitosPage() {
  const today = await getServerToday();
  const [habits, categories, focusHeader] = await Promise.all([
    getAllHabitsForManagement(today),
    getCategories(),
    getFocusHeaderData(),
  ]);

  return <HabitosClient habits={habits} categories={categories} focusHeader={focusHeader} today={today} />;
}
