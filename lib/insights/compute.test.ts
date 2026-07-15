import { describe, expect, it } from "vitest";
import {
  buildDailySignals,
  compareDailyMetric,
  spendByHabitCompletion,
  focusByGymDay,
  habitCompletionByGymDay,
  spendByMood,
  type DailySignal,
} from "./compute";
import type { HabitRow } from "@/lib/streaks/compute";

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
    startDate: "2026-06-01",
    endDate: null,
    status: "active",
    isPinned: false,
    sortOrder: 0,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function signal(overrides: Partial<DailySignal> & { date: string }): DailySignal {
  return {
    habitCompletionRate: null,
    avgMood: null,
    totalSpend: 0,
    focusMinutes: 0,
    hadGymSession: false,
    ...overrides,
  };
}

describe("compareDailyMetric", () => {
  const days = (n: number, value: number, bucket: "a" | "b") =>
    Array.from({ length: n }, (_, i) => signal({ date: `2026-07-${String(i + 1).padStart(2, "0")}`, totalSpend: value, hadGymSession: bucket === "a" }));

  it("returns null when either bucket has fewer than minSamples valid readings", () => {
    const rows = [...days(2, 100, "a"), ...days(5, 50, "b")];
    const result = compareDailyMetric(rows, (s) => s.hadGymSession, (s) => !s.hadGymSession, (s) => s.totalSpend);
    expect(result).toBeNull();
  });

  it("averages each bucket once both sides clear minSamples", () => {
    const rows = [...days(3, 100, "a"), ...days(3, 40, "b")];
    const result = compareDailyMetric(rows, (s) => s.hadGymSession, (s) => !s.hadGymSession, (s) => s.totalSpend);
    expect(result).toEqual({ aAvg: 100, bAvg: 40, aSamples: 3, bSamples: 3 });
  });

  it("skips null metric readings without counting them as samples", () => {
    const rows = [
      signal({ date: "2026-07-01", hadGymSession: true, habitCompletionRate: null }),
      signal({ date: "2026-07-02", hadGymSession: true, habitCompletionRate: 0.5 }),
      signal({ date: "2026-07-03", hadGymSession: true, habitCompletionRate: 0.9 }),
      signal({ date: "2026-07-04", hadGymSession: false, habitCompletionRate: 0.2 }),
      signal({ date: "2026-07-05", hadGymSession: false, habitCompletionRate: 0.4 }),
      signal({ date: "2026-07-06", hadGymSession: false, habitCompletionRate: 0.6 }),
    ];
    const result = compareDailyMetric(rows, (s) => s.hadGymSession, (s) => !s.hadGymSession, (s) => s.habitCompletionRate);
    expect(result).toBeNull(); // bucket "a" only has 2 valid (non-null) readings
  });
});

describe("buildDailySignals", () => {
  it("computes habitCompletionRate per day across active habits, null when none applicable", () => {
    const h1 = habit({ id: "h1", startDate: "2026-07-01" });
    const h2 = habit({ id: "h2", startDate: "2026-07-01" });
    const signals = buildDailySignals({
      from: "2026-07-01",
      today: "2026-07-02",
      activeHabits: [h1, h2],
      habitLogs: [
        { habitId: "h1", date: "2026-07-01", status: "done", mood: null },
        { habitId: "h2", date: "2026-07-01", status: "missed", mood: null },
        // 07-02 left unlogged for both habits
      ],
      transactions: [],
      gymSessionDates: [],
      focusRows: [],
    });

    expect(signals.find((s) => s.date === "2026-07-01")?.habitCompletionRate).toBe(0.5);
    // Unlogged today isn't "missed" per keepsStreakOn semantics (no status recorded) — so it's 0/2 done, not null.
    expect(signals.find((s) => s.date === "2026-07-02")?.habitCompletionRate).toBe(0);
  });

  it("averages non-null mood per day and leaves days without mood as null", () => {
    const signals = buildDailySignals({
      from: "2026-07-01",
      today: "2026-07-02",
      activeHabits: [],
      habitLogs: [
        { habitId: "h1", date: "2026-07-01", status: "done", mood: 2 },
        { habitId: "h2", date: "2026-07-01", status: "done", mood: 4 },
      ],
      transactions: [],
      gymSessionDates: [],
      focusRows: [],
    });

    expect(signals.find((s) => s.date === "2026-07-01")?.avgMood).toBe(3);
    expect(signals.find((s) => s.date === "2026-07-02")?.avgMood).toBeNull();
  });

  it("sums only expense transactions per day, converts focus seconds to minutes, and flags gym days", () => {
    const signals = buildDailySignals({
      from: "2026-07-01",
      today: "2026-07-01",
      activeHabits: [],
      habitLogs: [],
      transactions: [
        { date: "2026-07-01", type: "expense", amount: 100 },
        { date: "2026-07-01", type: "expense", amount: 50 },
        { date: "2026-07-01", type: "income", amount: 1000 },
      ],
      gymSessionDates: ["2026-07-01"],
      focusRows: [{ date: "2026-07-01", accumulatedActiveSeconds: 1800 }],
    });

    const day = signals[0];
    expect(day.totalSpend).toBe(150);
    expect(day.focusMinutes).toBe(30);
    expect(day.hadGymSession).toBe(true);
  });
});

describe("named cross-domain insights", () => {
  const rowsOf = (dates: string[], build: (date: string) => Partial<DailySignal>) =>
    dates.map((date) => signal({ date, ...build(date) }));

  it("spendByHabitCompletion compares high-completion days vs. low-completion days", () => {
    const highDays = rowsOf(["2026-07-01", "2026-07-02", "2026-07-03"], () => ({ habitCompletionRate: 0.9, totalSpend: 100 }));
    const lowDays = rowsOf(["2026-07-04", "2026-07-05", "2026-07-06"], () => ({ habitCompletionRate: 0.2, totalSpend: 300 }));
    const midDays = rowsOf(["2026-07-07"], () => ({ habitCompletionRate: 0.6, totalSpend: 9999 })); // excluded (neither bucket)

    const result = spendByHabitCompletion([...highDays, ...lowDays, ...midDays]);
    expect(result).toEqual({ aAvg: 100, bAvg: 300, aSamples: 3, bSamples: 3 });
  });

  it("focusByGymDay and habitCompletionByGymDay share the gym/non-gym bucket split", () => {
    const gymDays = rowsOf(["2026-07-01", "2026-07-02", "2026-07-03"], () => ({
      hadGymSession: true,
      focusMinutes: 60,
      habitCompletionRate: 0.9,
    }));
    const restDays = rowsOf(["2026-07-04", "2026-07-05", "2026-07-06"], () => ({
      hadGymSession: false,
      focusMinutes: 20,
      habitCompletionRate: 0.5,
    }));
    const all = [...gymDays, ...restDays];

    expect(focusByGymDay(all)).toEqual({ aAvg: 60, bAvg: 20, aSamples: 3, bSamples: 3 });
    expect(habitCompletionByGymDay(all)).toEqual({ aAvg: 0.9, bAvg: 0.5, aSamples: 3, bSamples: 3 });
  });

  it("spendByMood compares low-mood days vs. high-mood days, excluding the middle", () => {
    const lowMood = rowsOf(["2026-07-01", "2026-07-02", "2026-07-03"], () => ({ avgMood: 1.5, totalSpend: 400 }));
    const highMood = rowsOf(["2026-07-04", "2026-07-05", "2026-07-06"], () => ({ avgMood: 4.5, totalSpend: 150 }));
    const neutral = rowsOf(["2026-07-07"], () => ({ avgMood: 3, totalSpend: 9999 }));

    const result = spendByMood([...lowMood, ...highMood, ...neutral]);
    expect(result).toEqual({ aAvg: 400, bAvg: 150, aSamples: 3, bSamples: 3 });
  });

  it("returns null for every insight when there isn't enough data", () => {
    const sparse = rowsOf(["2026-07-01"], () => ({ hadGymSession: true, focusMinutes: 60 }));
    expect(spendByHabitCompletion(sparse)).toBeNull();
    expect(focusByGymDay(sparse)).toBeNull();
    expect(habitCompletionByGymDay(sparse)).toBeNull();
    expect(spendByMood(sparse)).toBeNull();
  });
});
