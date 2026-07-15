"use server";

import { getGymExercises } from "@/lib/queries/gym-exercises";

/** Thin read-only wrapper (server-only, can't be imported into a Client
 * Component) so it's callable as an SWR fetcher, same split as
 * lib/actions/gym-read.ts. includeHidden: true — this backs GymClient's
 * exercisesById lookup for past sessions (see gym-client.tsx), which must
 * keep resolving names for exercises hidden since they were logged; the
 * new-session picker builds its own catalog separately (see
 * gym-session-form.tsx) and already excludes hidden ones there. */
export async function fetchGymExercisesAction() {
  return getGymExercises(true);
}
