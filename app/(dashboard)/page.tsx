import { getHabitsForToday } from "@/lib/queries/habits";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { HoyClient } from "./hoy-client";

export default async function HoyPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const habits = await getHabitsForToday(today);

  return <HoyClient habits={habits} date={today} />;
}
