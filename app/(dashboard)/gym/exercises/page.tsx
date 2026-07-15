import { getGymExercises } from "@/lib/queries/gym-exercises";
import { GymExercisesClient } from "./gym-exercises-client";

export default async function EjerciciosGymPage() {
  // includeHidden: true — this page is the only place a hidden exercise
  // needs to be visible at all, so it can be shown/unhidden again.
  const exercises = await getGymExercises(true);
  return <GymExercisesClient exercises={exercises} />;
}
