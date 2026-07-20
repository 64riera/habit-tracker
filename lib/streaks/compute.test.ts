import { describe, expect, it } from "vitest";
import { computeStreak, type HabitRow, type LogStatusRow } from "./compute";

function habit(overrides: Partial<HabitRow> = {}): HabitRow {
  return {
    id: "h1",
    userId: "u1",
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
    startDate: "2026-07-01",
    status: "active",
    isPinned: false,
    sortOrder: 0,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function log(date: string, status: string): LogStatusRow {
  return { date, status };
}

describe("computeStreak — daily (unchanged behavior)", () => {
  it("keeps a running streak alive across consecutive done days", () => {
    const h = habit({ startDate: "2026-07-10" });
    const logs = [log("2026-07-10", "done"), log("2026-07-11", "done"), log("2026-07-12", "done")];
    const result = computeStreak(h, logs, "2026-07-12");
    expect(result?.currentStreak).toBe(3);
    expect(result?.longestStreak).toBe(3);
  });

  it("breaks the streak on a missed applicable day", () => {
    const h = habit({ startDate: "2026-07-10" });
    const logs = [log("2026-07-10", "done"), log("2026-07-12", "done")]; // 11th missed
    const result = computeStreak(h, logs, "2026-07-12");
    expect(result?.currentStreak).toBe(1);
    expect(result?.longestStreak).toBe(1);
  });

  it("does not break the streak for today, unlogged yet", () => {
    const h = habit({ startDate: "2026-07-10" });
    const logs = [log("2026-07-10", "done"), log("2026-07-11", "done")];
    const result = computeStreak(h, logs, "2026-07-12");
    expect(result?.currentStreak).toBe(2);
  });
});

describe("computeStreak — x_per_week (regression: quota was previously ignored)", () => {
  const weeklyHabit = habit({
    startDate: "2026-07-06", // a Monday
    frequencyType: "x_per_week",
    frequencyConfig: JSON.stringify({ timesPerPeriod: 3 }),
  });

  it("does NOT break the streak on days left unlogged by design, once the week's quota is met", () => {
    // Mon 07-06, Wed 07-08, Fri 07-10 logged (3x that week) — Tue/Thu/Sat/Sun left unlogged.
    const logs = [log("2026-07-06", "done"), log("2026-07-08", "done"), log("2026-07-10", "done")];
    const result = computeStreak(weeklyHabit, logs, "2026-07-10");
    // Previously this returned currentStreak=1 (broken by Tue 07-07 being "missed").
    expect(result?.currentStreak).toBeGreaterThan(1);
  });

  it("credits the whole week once quota is met, then keeps building the next week", () => {
    // Week 1 (Mon 07-06..Sun 07-12): logged Mon/Wed/Fri = 3 -> quota met, credits 7 days.
    // Week 2 (Mon 07-13..): logged Mon/Tue so far = 2, quota not yet met, current period stays neutral.
    const logs = [
      log("2026-07-06", "done"),
      log("2026-07-08", "done"),
      log("2026-07-10", "done"),
      log("2026-07-13", "done"),
      log("2026-07-14", "done"),
    ];
    const result = computeStreak(weeklyHabit, logs, "2026-07-14");
    expect(result?.currentStreak).toBe(7); // week 1 fully credited, week 2 still undecided
  });

  it("breaks the streak once a fully-elapsed week falls short of quota", () => {
    // Week 1: only 1 done (Mon) — falls short of quota of 3, and week 2 has started (07-13 Mon),
    // so week 1 is definitively over and failed.
    const logs = [log("2026-07-06", "done"), log("2026-07-13", "done")];
    const result = computeStreak(weeklyHabit, logs, "2026-07-13");
    // Week 1 failed (1 < 3) -> running resets to 0 before week 2 (in progress) adds anything.
    expect(result?.currentStreak).toBe(0);
  });
});

describe("computeStreak — x_per_month", () => {
  const monthlyHabit = habit({
    startDate: "2026-06-01",
    frequencyType: "x_per_month",
    frequencyConfig: JSON.stringify({ timesPerPeriod: 2 }),
  });

  it("credits the whole month once quota is met", () => {
    // June: logged twice (quota met, all 30 days credited). July so far: 1 logged
    // day, short of the quota of 2 -> current period stays neutral, doesn't add.
    const logs = [log("2026-06-05", "done"), log("2026-06-20", "done"), log("2026-07-01", "done")];
    const result = computeStreak(monthlyHabit, logs, "2026-07-01");
    expect(result?.currentStreak).toBe(30);
  });

  it("resets once a fully-elapsed month falls short", () => {
    const logs = [log("2026-06-05", "done"), log("2026-07-01", "done")]; // June only had 1, needed 2
    const result = computeStreak(monthlyHabit, logs, "2026-07-01");
    expect(result?.currentStreak).toBe(0);
  });
});
