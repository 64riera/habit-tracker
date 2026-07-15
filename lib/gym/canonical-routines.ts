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
      { nameEs: "Press inclinado en máquina", note: "3x6–10" },
      { nameEs: "Remo en máquina (pecho apoyado)", note: "3x8–12" },
      { nameEs: "Jalón al pecho", note: "3x8–12" },
      { nameEs: "Peck deck", note: "2x12–15" },
      { nameEs: "Press militar de hombros (máquina)", note: "4x12" },
      { nameEs: "Curl de bíceps (máquina o barra Z)", note: "3x10–15" },
      { nameEs: "Extensión de tríceps en polea", note: "3x10–15" },
      { nameEs: "Face pull / reverse pec deck", note: "2x15–20" },
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
      { nameEs: "Jalón al pecho", note: "3x6–10" },
      { nameEs: "Chest press plano", note: "3x8–12" },
      { nameEs: "Remo sentado en polea", note: "3x8–12" },
      { nameEs: "Peck deck", note: "2x12–15" },
      { nameEs: "Elevaciones laterales", note: "3–4x12–20" },
      { nameEs: "Tríceps overhead en polea", note: "3x10–15" },
      { nameEs: "Curl martillo", note: "3x10–15" },
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
