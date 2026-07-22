import { getGymSessions, getGymSessionDraft } from "@/lib/queries/gym";
import { getGymExercises } from "@/lib/queries/gym-exercises";
import { getServerToday } from "@/lib/settings/date-server";
import { GymClient } from "./gym-client";

export default async function GymPage() {
  // includeHidden: true — past sessions may reference an exercise that's
  // since been hidden; the history list still needs its name to display it.
  const [sessions, exercises, today, draft] = await Promise.all([
    getGymSessions(),
    getGymExercises(true),
    getServerToday(),
    getGymSessionDraft(),
  ]);
  return <GymClient sessions={sessions} exercises={exercises} today={today} draft={draft} />;
}
