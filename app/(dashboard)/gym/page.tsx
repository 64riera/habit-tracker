import { getGymSessions } from "@/lib/queries/gym";
import { getGymExercises } from "@/lib/queries/gym-exercises";
import { getServerToday } from "@/lib/settings/date-server";
import { GymClient } from "./gym-client";

export default async function GymPage() {
  const [sessions, exercises, today] = await Promise.all([getGymSessions(), getGymExercises(), getServerToday()]);
  return <GymClient sessions={sessions} exercises={exercises} today={today} />;
}
