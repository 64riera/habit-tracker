import { getFocusHistory } from "@/lib/queries/focus";
import { getHabitNames } from "@/lib/queries/habits";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { FocusHistorialClient } from "./historial-client";

export default async function FocusHistorialPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

  const [sessions, habitNames] = await Promise.all([getFocusHistory(50), getHabitNames()]);

  return <FocusHistorialClient sessions={sessions} habitNames={habitNames} today={today} />;
}
