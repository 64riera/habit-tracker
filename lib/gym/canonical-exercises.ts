export const MUSCLE_GROUPS = ["chest", "back", "shoulders", "arms", "legs", "core", "cardio"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Fixed catalog every account gets, mirroring how habit/finance categories
 * work (see lib/habits/canonical-categories.ts, lib/finance/canonical-categories.ts):
 * single source of truth for both the self-healing backfill in
 * getGymExercises() and, eventually, seeding new accounts. Exercise names
 * are now picked from this list instead of typed freely, so stats can
 * aggregate by an exact id instead of fuzzy-matching text (see
 * lib/gym/stats.ts's old name-normalization, no longer needed). */
export const CANONICAL_GYM_EXERCISES: { nameEs: string; nameEn: string; muscleGroup: MuscleGroup }[] = [
  // Pecho / Chest
  { nameEs: "Press de banca", nameEn: "Bench press", muscleGroup: "chest" },
  { nameEs: "Press de banca inclinado", nameEn: "Incline bench press", muscleGroup: "chest" },
  { nameEs: "Press de banca declinado", nameEn: "Decline bench press", muscleGroup: "chest" },
  { nameEs: "Press inclinado con mancuernas", nameEn: "Incline dumbbell press", muscleGroup: "chest" },
  { nameEs: "Aperturas con mancuernas", nameEn: "Dumbbell flyes", muscleGroup: "chest" },
  { nameEs: "Aperturas en polea (pec fly)", nameEn: "Cable flyes (pec deck)", muscleGroup: "chest" },
  { nameEs: "Fondos en paralelas", nameEn: "Chest dips", muscleGroup: "chest" },
  { nameEs: "Press en máquina", nameEn: "Chest press machine", muscleGroup: "chest" },

  // Espalda / Back
  { nameEs: "Dominadas", nameEn: "Pull-ups", muscleGroup: "back" },
  { nameEs: "Jalón al pecho", nameEn: "Lat pulldown", muscleGroup: "back" },
  { nameEs: "Remo con barra", nameEn: "Barbell row", muscleGroup: "back" },
  { nameEs: "Remo con mancuerna", nameEn: "Dumbbell row", muscleGroup: "back" },
  { nameEs: "Remo sentado en polea", nameEn: "Seated cable row", muscleGroup: "back" },
  { nameEs: "Remo en máquina", nameEn: "Row machine", muscleGroup: "back" },
  { nameEs: "Peso muerto", nameEn: "Deadlift", muscleGroup: "back" },
  { nameEs: "Face pull", nameEn: "Face pull", muscleGroup: "back" },

  // Hombros / Shoulders
  { nameEs: "Press militar", nameEn: "Overhead press", muscleGroup: "shoulders" },
  { nameEs: "Press Arnold", nameEn: "Arnold press", muscleGroup: "shoulders" },
  { nameEs: "Press de hombros en máquina", nameEn: "Shoulder press machine", muscleGroup: "shoulders" },
  { nameEs: "Elevaciones laterales", nameEn: "Lateral raises", muscleGroup: "shoulders" },
  { nameEs: "Elevaciones frontales", nameEn: "Front raises", muscleGroup: "shoulders" },
  { nameEs: "Pájaro (posteriores)", nameEn: "Rear delt fly", muscleGroup: "shoulders" },

  // Brazos / Arms
  { nameEs: "Curl de bíceps con barra", nameEn: "Barbell curl", muscleGroup: "arms" },
  { nameEs: "Curl de bíceps con mancuerna", nameEn: "Dumbbell curl", muscleGroup: "arms" },
  { nameEs: "Curl predicador en máquina", nameEn: "Preacher curl machine", muscleGroup: "arms" },
  { nameEs: "Curl martillo", nameEn: "Hammer curl", muscleGroup: "arms" },
  { nameEs: "Tríceps en polea", nameEn: "Triceps pushdown", muscleGroup: "arms" },
  { nameEs: "Tríceps francés", nameEn: "Overhead triceps extension", muscleGroup: "arms" },
  { nameEs: "Press francés con barra", nameEn: "Skull crushers", muscleGroup: "arms" },
  { nameEs: "Fondos de tríceps", nameEn: "Triceps dips", muscleGroup: "arms" },

  // Piernas / Legs
  { nameEs: "Sentadilla", nameEn: "Squat", muscleGroup: "legs" },
  { nameEs: "Sentadilla búlgara", nameEn: "Bulgarian split squat", muscleGroup: "legs" },
  { nameEs: "Prensa de piernas", nameEn: "Leg press", muscleGroup: "legs" },
  { nameEs: "Zancadas", nameEn: "Lunges", muscleGroup: "legs" },
  { nameEs: "Extensión de cuádriceps", nameEn: "Leg extension", muscleGroup: "legs" },
  { nameEs: "Curl femoral", nameEn: "Leg curl", muscleGroup: "legs" },
  { nameEs: "Peso muerto rumano", nameEn: "Romanian deadlift", muscleGroup: "legs" },
  { nameEs: "Elevación de talones", nameEn: "Calf raises", muscleGroup: "legs" },
  { nameEs: "Hip thrust", nameEn: "Hip thrust", muscleGroup: "legs" },

  // Core
  { nameEs: "Plancha", nameEn: "Plank", muscleGroup: "core" },
  { nameEs: "Abdominales", nameEn: "Crunches", muscleGroup: "core" },
  { nameEs: "Elevación de piernas", nameEn: "Leg raises", muscleGroup: "core" },
  { nameEs: "Russian twist", nameEn: "Russian twist", muscleGroup: "core" },
  { nameEs: "Rueda abdominal", nameEn: "Ab wheel rollout", muscleGroup: "core" },

  // Cardio
  { nameEs: "Cinta de correr", nameEn: "Treadmill", muscleGroup: "cardio" },
  { nameEs: "Bicicleta estática", nameEn: "Stationary bike", muscleGroup: "cardio" },
  { nameEs: "Elíptica", nameEn: "Elliptical", muscleGroup: "cardio" },
  { nameEs: "Remo (cardio)", nameEn: "Rowing machine", muscleGroup: "cardio" },
  { nameEs: "Escaladora", nameEn: "Stair climber", muscleGroup: "cardio" },
];
