export const MUSCLE_GROUPS = ["chest", "back", "shoulders", "arms", "legs", "core", "cardio"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Fixed catalog every account gets, mirroring how habit/finance categories
 * work (see lib/habits/canonical-categories.ts, lib/finance/canonical-categories.ts):
 * single source of truth for both the self-healing backfill in
 * getGymExercises() and, eventually, seeding new accounts. Exercise names
 * are now picked from this list instead of typed freely, so stats can
 * aggregate by an exact id instead of fuzzy-matching text (see
 * lib/gym/stats.ts's old name-normalization, no longer needed).
 *
 * Trimmed down to the exercises actually used across Upper A/B and Pierna
 * A/B (the routine this account trains) instead of a generic 49-exercise
 * gym catalog — the rest is now something the user adds themselves via
 * /gym/exercises (see lib/actions/gym-exercises.ts) rather than picked from
 * a long list of movements they don't do. getGymExercises() hides (not
 * deletes) any previously-seeded exercise that isn't in this list anymore,
 * so past sessions logged against the old catalog keep displaying correctly. */
export const CANONICAL_GYM_EXERCISES: { nameEs: string; nameEn: string; muscleGroup: MuscleGroup }[] = [
  // Pecho / Chest
  { nameEs: "Press inclinado en máquina", nameEn: "Incline machine chest press", muscleGroup: "chest" },
  { nameEs: "Chest press plano", nameEn: "Flat chest press (machine)", muscleGroup: "chest" },
  { nameEs: "Peck deck", nameEn: "Pec deck", muscleGroup: "chest" },

  // Espalda / Back
  { nameEs: "Remo en máquina (pecho apoyado)", nameEn: "Chest-supported row machine", muscleGroup: "back" },
  { nameEs: "Remo sentado en polea", nameEn: "Seated cable row", muscleGroup: "back" },
  { nameEs: "Remo unilateral", nameEn: "Single-arm row", muscleGroup: "back" },
  { nameEs: "Jalón al pecho", nameEn: "Lat pulldown", muscleGroup: "back" },
  { nameEs: "Face pull / reverse pec deck", nameEn: "Face pull / reverse pec deck", muscleGroup: "back" },

  // Hombros / Shoulders
  { nameEs: "Press militar de hombros (máquina)", nameEn: "Shoulder press machine", muscleGroup: "shoulders" },
  { nameEs: "Elevaciones laterales", nameEn: "Lateral raises", muscleGroup: "shoulders" },

  // Brazos / Arms
  { nameEs: "Curl de bíceps (máquina o barra Z)", nameEn: "Bicep curl (machine or EZ bar)", muscleGroup: "arms" },
  { nameEs: "Curl martillo", nameEn: "Hammer curl", muscleGroup: "arms" },
  { nameEs: "Curl inclinado", nameEn: "Incline dumbbell curl", muscleGroup: "arms" },
  { nameEs: "Curl predicador (máquina)", nameEn: "Preacher curl machine", muscleGroup: "arms" },
  { nameEs: "Extensión de tríceps en polea", nameEn: "Triceps pushdown", muscleGroup: "arms" },
  { nameEs: "Tríceps overhead en polea", nameEn: "Overhead triceps extension (cable)", muscleGroup: "arms" },

  // Piernas / Legs
  { nameEs: "Curl femoral sentado (isquio)", nameEn: "Seated leg curl (hamstring)", muscleGroup: "legs" },
  { nameEs: "Extensión de cuádriceps (pierna)", nameEn: "Leg extension", muscleGroup: "legs" },
  { nameEs: "Prensa de piernas", nameEn: "Leg press", muscleGroup: "legs" },
  { nameEs: "Hip thrust", nameEn: "Hip thrust", muscleGroup: "legs" },
  { nameEs: "Elevación de talones (pantorrilla)", nameEn: "Calf raise", muscleGroup: "legs" },
  { nameEs: "Aductor (máquina)", nameEn: "Adductor machine", muscleGroup: "legs" },
  { nameEs: "Abductor (máquina)", nameEn: "Abductor machine", muscleGroup: "legs" },

  // Core
  { nameEs: "Crunch abdominal (máquina)", nameEn: "Abdominal crunch machine", muscleGroup: "core" },
];
