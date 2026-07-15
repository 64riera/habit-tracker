export type GymSet = {
  weight?: string; // free text: "12.5", "43+5" (stack + add-on plates), etc. — no enforced unit; omitted for bodyweight sets
  reps: number;
};

export type GymExercise = {
  exerciseId: string; // references gymExercises (lib/queries/gym-exercises.ts) — see lib/gym/canonical-exercises.ts
  note?: string;
  sets: GymSet[];
};

/** A gymRoutines row's `exercises` column — same shape as GymExercise minus
 * `sets`: a routine is a template of what to do, not a record of what was
 * done. Starting a new session from one (see gym-session-form.tsx) turns
 * each entry into a GymExercise with a single empty set. */
export type RoutineExercise = {
  exerciseId: string;
  note?: string;
};
