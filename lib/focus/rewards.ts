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

/** Axis 1: tree size, by cumulative focus hours (lifetime). */
export const HOUR_TIERS: { tier: FocusRewardTier; hours: number }[] = [
  { tier: "seed", hours: 0 },
  { tier: "sprout", hours: 1 },
  { tier: "sapling", hours: 5 },
  { tier: "young_tree", hours: 15 },
  { tier: "mature_tree", hours: 40 },
];

/** Axis 2: forest size, by number of completed sessions. An axis
 * independent from hours — frequent short sessions also grow the forest,
 * not just long ones. */
export const SESSION_COUNT_TIERS: { tier: FocusRewardTier; sessions: number }[] = [
  { tier: "grove_3", sessions: 3 },
  { tier: "grove_10", sessions: 10 },
  { tier: "forest_25", sessions: 25 },
  { tier: "forest_50", sessions: 50 },
];

/**
 * Pure computation (no I/O) of which tiers unlock, mirroring
 * `computeNewAchievements`. Only invoked right after a session transitions
 * to "completed" (never with 0 completed sessions yet), so the "seed"
 * threshold of 0 hours doesn't unlock prematurely.
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
