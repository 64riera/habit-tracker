export type GymSet = {
  weight?: string; // free text: "12.5", "43+5" (stack + add-on plates), etc. — no enforced unit; omitted for bodyweight sets
  reps: number;
};

export type GymExercise = {
  name: string;
  note?: string;
  sets: GymSet[];
};
