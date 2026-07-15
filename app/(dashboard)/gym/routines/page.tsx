import { getGymExercises } from "@/lib/queries/gym-exercises";
import { getGymRoutines } from "@/lib/queries/gym-routines";
import { GymRoutinesClient } from "./gym-routines-client";

export default async function RutinasGymPage() {
  // includeHidden: true on both — this page is where a hidden routine or
  // exercise needs to still be visible/selectable to be shown/unhidden or
  // used inside a routine again.
  const [exercises, routines] = await Promise.all([getGymExercises(true), getGymRoutines(true)]);
  return <GymRoutinesClient exercises={exercises} routines={routines} />;
}
