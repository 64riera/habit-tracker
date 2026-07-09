export type FocusRewardTier =
  | "seed"
  | "sprout"
  | "sapling"
  | "young_tree"
  | "mature_tree"
  | "grove_3"
  | "grove_10"
  | "forest_25"
  | "forest_50";

/** Eje 1: tamaño del árbol, por horas de enfoque acumuladas (de por vida). */
export const HOUR_TIERS: { tier: FocusRewardTier; hours: number }[] = [
  { tier: "seed", hours: 0 },
  { tier: "sprout", hours: 1 },
  { tier: "sapling", hours: 5 },
  { tier: "young_tree", hours: 15 },
  { tier: "mature_tree", hours: 40 },
];

/** Eje 2: tamaño del bosque, por cantidad de sesiones completadas. Un eje
 * independiente de las horas — sesiones cortas frecuentes también hacen
 * crecer el bosque, no solo sesiones largas. */
export const SESSION_COUNT_TIERS: { tier: FocusRewardTier; sessions: number }[] = [
  { tier: "grove_3", sessions: 3 },
  { tier: "grove_10", sessions: 10 },
  { tier: "forest_25", sessions: 25 },
  { tier: "forest_50", sessions: 50 },
];

/**
 * Cómputo puro (sin I/O) de qué tiers se desbloquean, mirror de
 * `computeNewAchievements`. Se invoca solo justo después de que una sesión
 * pasa a "completed" (nunca con 0 sesiones completadas todavía), así que el
 * umbral de 0 horas de "seed" no se desbloquea prematuramente.
 */
export function computeNewRewardTiers({
  totalCompletedFocusSeconds,
  completedSessionCount,
  alreadyUnlockedTiers,
}: {
  totalCompletedFocusSeconds: number;
  completedSessionCount: number;
  alreadyUnlockedTiers: Set<FocusRewardTier>;
}): FocusRewardTier[] {
  const unlocked: FocusRewardTier[] = [];
  const hours = totalCompletedFocusSeconds / 3600;

  for (const t of HOUR_TIERS) {
    if (hours >= t.hours && !alreadyUnlockedTiers.has(t.tier)) unlocked.push(t.tier);
  }
  for (const t of SESSION_COUNT_TIERS) {
    if (completedSessionCount >= t.sessions && !alreadyUnlockedTiers.has(t.tier)) unlocked.push(t.tier);
  }
  return unlocked;
}
