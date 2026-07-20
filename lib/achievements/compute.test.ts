import { describe, expect, it } from "vitest";
import { computeNewAchievements } from "./compute";
import type { HabitRow, StreakComputation } from "@/lib/streaks/compute";

function makeHabit(overrides: Partial<HabitRow>): HabitRow {
  return {
    id: "habit-1",
    userId: "user-1",
    categoryId: null,
    name: "Test habit",
    description: null,
    icon: null,
    color: null,
    goalType: "binary",
    goalTarget: null,
    goalUnit: null,
    frequencyType: "daily",
    frequencyConfig: null,
    reminders: null,
    hardMode: false,
    skipDaysAllowed: 0,
    startDate: "2026-01-01",
    status: "active",
    isPinned: false,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const noStreak: StreakComputation = {
  currentStreak: 0,
  longestStreak: 0,
  freezesAvailable: 0,
  freezesUsedThisMonth: 0,
};

describe("computeNewAchievements — perfect_month", () => {
  it("does not unlock when a custom_interval habit has zero applicable days this month", () => {
    // interval of 60 days from 2026-01-01 lands on Jan 1, Mar 2, May 1, Jun 30,
    // Aug 29 — July never comes up, so July has no applicable days at all.
    const habit = makeHabit({
      frequencyType: "custom_interval",
      frequencyConfig: JSON.stringify({ intervalDays: 60 }),
      startDate: "2026-01-01",
    });

    const unlocked = computeNewAchievements({
      habit,
      logs: [],
      streak: noStreak,
      alreadyUnlockedTypes: new Set(),
      today: "2026-07-20",
    });

    expect(unlocked).not.toContain("perfect_month");
  });

  it("still unlocks for a daily habit fully logged this month", () => {
    const habit = makeHabit({ frequencyType: "daily", startDate: "2026-07-01" });
    const logs = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      status: "done",
    }));

    const unlocked = computeNewAchievements({
      habit,
      logs,
      streak: noStreak,
      alreadyUnlockedTypes: new Set(),
      today: "2026-07-20",
    });

    expect(unlocked).toContain("perfect_month");
  });
});
