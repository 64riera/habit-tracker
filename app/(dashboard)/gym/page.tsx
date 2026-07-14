import { getGymSessions } from "@/lib/queries/gym";
import { getServerToday } from "@/lib/settings/date-server";
import { GymClient } from "./gym-client";

export default async function GymPage() {
  const [sessions, today] = await Promise.all([getGymSessions(), getServerToday()]);
  return <GymClient sessions={sessions} today={today} />;
}
