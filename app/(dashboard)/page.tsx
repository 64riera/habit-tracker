import { getHabitsForToday } from "@/lib/queries/habits";
import { getRoutinesForToday } from "@/lib/queries/routines";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { HoyClient } from "./hoy-client";

export default async function HoyPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const [habits, routines] = await Promise.all([
    getHabitsForToday(today),
    getRoutinesForToday(today),
  ]);

  return <HoyClient habits={habits} routines={routines} date={today} />;
}
