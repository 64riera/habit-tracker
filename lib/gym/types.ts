export type GymSet = {
  weight?: string; // free text: "12.5", "43+5" (stack + add-on plates), etc. — no enforced unit; omitted for bodyweight sets
  reps: number;
};

export type GymExercise = {
  exerciseId: string; // references gymExercises (lib/queries/gym-exercises.ts) — see lib/gym/canonical-exercises.ts
  note?: string;
  sets: GymSet[];
};
