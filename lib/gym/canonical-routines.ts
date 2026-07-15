/** Seeded once per account (see lib/queries/gym-routines.ts), matching the
 * actual weekly split this catalog was built around (see
 * lib/gym/canonical-exercises.ts): Upper A/Pierna A/Upper B/Pierna B.
 * Exercises are referenced by `nameEs` here — not by id, since a fixed
 * canonical id would need to be the same across every account — and
 * resolved to this user's own gymExercises row id at seed time. `note` is
 * the set×rep target (e.g. "3x6–10"): pre-filled into the session
 * exercise's own note field when a session is started from this routine,
 * reusing that field instead of a separate "target" concept. */
export const CANONICAL_GYM_ROUTINES: { name: string; exercises: { nameEs: string; note?: string }[] }[] = [
  {
    name: "Upper A",
    exercises: [
      { nameEs: "Press inclinado en máquina" },
      { nameEs: "Jalón al pecho" },
      { nameEs: "Peck deck" },
      { nameEs: "Remo sentado en polea" },
      { nameEs: "Press militar de hombros (máquina)" },
      { nameEs: "Extensión de tríceps en polea" },
      { nameEs: "Curl predicador (máquina)" },
    ],
  },
  {
    name: "Pierna A",
    exercises: [
      { nameEs: "Curl femoral sentado (isquio)" },
      { nameEs: "Extensión de cuádriceps (pierna)" },
      { nameEs: "Prensa de piernas" },
      { nameEs: "Hip thrust", note: "2x8" },
      { nameEs: "Elevación de talones (pantorrilla)", note: "4x20" },
      { nameEs: "Aductor (máquina)", note: "2x12" },
      { nameEs: "Abductor (máquina)", note: "2x12" },
      { nameEs: "Crunch abdominal (máquina)", note: "4x12" },
    ],
  },
  {
    name: "Upper B",
    exercises: [
      { nameEs: "Jalón al pecho" },
      { nameEs: "Chest press plano" },
      { nameEs: "Remo unilateral" },
      { nameEs: "Face pull / reverse pec deck" },
      { nameEs: "Elevaciones laterales" },
      { nameEs: "Curl inclinado" },
      { nameEs: "Tríceps overhead en polea" },
    ],
  },
  {
    name: "Pierna B",
    exercises: [
      { nameEs: "Curl femoral sentado (isquio)" },
      { nameEs: "Extensión de cuádriceps (pierna)" },
      { nameEs: "Prensa de piernas" },
      { nameEs: "Hip thrust" },
      { nameEs: "Elevación de talones (pantorrilla)" },
      { nameEs: "Aductor (máquina)" },
      { nameEs: "Crunch abdominal (máquina)" },
    ],
  },
];
