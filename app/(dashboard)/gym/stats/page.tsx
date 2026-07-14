import { getGymSessions } from "@/lib/queries/gym";
import { getGymExercises } from "@/lib/queries/gym-exercises";
import { getServerToday } from "@/lib/settings/date-server";
import { GymEstadisticasClient } from "./gym-stats-client";

export default async function GymEstadisticasPage() {
  const [sessions, exercises, today] = await Promise.all([getGymSessions(), getGymExercises(), getServerToday()]);
  return <GymEstadisticasClient sessions={sessions} exercises={exercises} today={today} />;
}
