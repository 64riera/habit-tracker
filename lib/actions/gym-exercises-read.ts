"use server";

import { getGymExercises } from "@/lib/queries/gym-exercises";

/** Thin read-only wrapper (server-only, can't be imported into a Client
 * Component) so it's callable as an SWR fetcher, same split as
 * lib/actions/gym-read.ts. */
export async function fetchGymExercisesAction() {
  return getGymExercises();
}
