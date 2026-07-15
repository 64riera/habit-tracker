import { describe, expect, it } from "vitest";
import { computeNewRewardTiers, treeSizeForSessionMinutes } from "./rewards";

describe("treeSizeForSessionMinutes", () => {
  it("returns seed below the sprout threshold", () => {
    expect(treeSizeForSessionMinutes(0)).toBe("seed");
    expect(treeSizeForSessionMinutes(14)).toBe("seed");
  });

  it("steps up exactly at each boundary", () => {
    expect(treeSizeForSessionMinutes(15)).toBe("sprout");
    expect(treeSizeForSessionMinutes(29)).toBe("sprout");
    expect(treeSizeForSessionMinutes(30)).toBe("sapling");
    expect(treeSizeForSessionMinutes(59)).toBe("sapling");
    expect(treeSizeForSessionMinutes(60)).toBe("young_tree");
    expect(treeSizeForSessionMinutes(119)).toBe("young_tree");
    expect(treeSizeForSessionMinutes(120)).toBe("mature_tree");
  });

  it("caps at mature_tree for very long sessions", () => {
    expect(treeSizeForSessionMinutes(600)).toBe("mature_tree");
  });
});

describe("computeNewRewardTiers", () => {
  it("only unlocks seed (0h threshold) when nothing else is met yet", () => {
    const tiers = computeNewRewardTiers({
      totalCompletedFocusSeconds: 0,
      completedSessionCount: 0,
      alreadyUnlockedTiers: new Set(),
    });
    expect(tiers).toEqual(["seed"]);
  });

  it("unlocks every tier crossed at once on the first check", () => {
    const tiers = computeNewRewardTiers({
      totalCompletedFocusSeconds: 3600 * 6, // 6h -> seed, sprout, sapling
      completedSessionCount: 10, // -> grove_3, grove_10
      alreadyUnlockedTiers: new Set(),
    });
    expect(tiers).toEqual(expect.arrayContaining(["seed", "sprout", "sapling", "grove_3", "grove_10"]));
    expect(tiers).not.toContain("young_tree");
    expect(tiers).not.toContain("forest_25");
  });

  it("doesn't re-unlock tiers that are already unlocked", () => {
    const tiers = computeNewRewardTiers({
      totalCompletedFocusSeconds: 3600 * 6,
      completedSessionCount: 10,
      alreadyUnlockedTiers: new Set(["seed", "sprout", "sapling", "grove_3", "grove_10"]),
    });
    expect(tiers).toEqual([]);
  });
});
