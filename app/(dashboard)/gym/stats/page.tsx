import { getGymSessions } from "@/lib/queries/gym";
import { getServerToday } from "@/lib/settings/date-server";
import { GymEstadisticasClient } from "./gym-stats-client";

export default async function GymEstadisticasPage() {
  const [sessions, today] = await Promise.all([getGymSessions(), getServerToday()]);
  return <GymEstadisticasClient sessions={sessions} today={today} />;
}
