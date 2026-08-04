import type { GymSessionRow } from "@/lib/queries/gym";
import type { GymSet } from "@/lib/gym/types";

export type LastPerformance = { note?: string; sets: GymSet[] };

/**
 * The most recent logged sets and note for each exercise, keyed by
 * exerciseId — `sessions` is already sorted most-recent-first (see
 * getGymSessions), so the first match per exercise is its last performance.
 * Powers the "last time" recall in GymSessionForm when starting a brand new
 * session. Plain object, not a Map, so it stays a trivially serializable
 * Server->Client Component prop.
 */
export function lastPerformanceByExercise(sessions: GymSessionRow[]): Record<string, LastPerformance> {
  const result: Record<string, LastPerformance> = {};
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (!(exercise.exerciseId in result)) result[exercise.exerciseId] = { note: exercise.note, sets: exercise.sets };
    }
  }
  return result;
}
