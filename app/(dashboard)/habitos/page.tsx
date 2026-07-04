import { getAllHabitsForManagement } from "@/lib/queries/habits";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { HabitosClient } from "./habitos-client";

export default async function HabitosPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const habits = await getAllHabitsForManagement(today);

  return <HabitosClient habits={habits} />;
}
