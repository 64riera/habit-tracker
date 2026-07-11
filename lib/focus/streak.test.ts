import { describe, expect, it } from "vitest";
import { computeFocusStreak } from "./streak";

describe("computeFocusStreak", () => {
  it("counts a simple run of consecutive days meeting the goal", () => {
    const days = new Map([
      ["2026-07-07", 65],
      ["2026-07-08", 70],
      ["2026-07-09", 60],
    ]);
    const { current, longest } = computeFocusStreak(days, 60, "2026-07-09");
    expect(current).toBe(3);
    expect(longest).toBe(3);
  });

  it("a gap cuts the current streak short", () => {
    const days = new Map([
      ["2026-07-05", 60],
      ["2026-07-06", 60],
      // 07-07 is missing (0 min): breaks the streak
      ["2026-07-08", 60],
      ["2026-07-09", 60],
    ]);
    const { current, longest } = computeFocusStreak(days, 60, "2026-07-09");
    expect(current).toBe(2);
    expect(longest).toBe(2);
  });

  it("exactly meeting the goal counts, one minute under does not", () => {
    const days = new Map([
      ["2026-07-08", 60],
      ["2026-07-09", 59],
    ]);
    const { current } = computeFocusStreak(days, 60, "2026-07-09");
    // Today doesn't meet the goal (59 &lt; 60), so the current streak starts yesterday.
    expect(current).toBe(1);
  });

  it("returns zero for empty data", () => {
    expect(computeFocusStreak(new Map(), 60, "2026-07-09")).toEqual({ current: 0, longest: 0 });
  });

  it("doesn't break the streak just because today hasn't met the goal yet (session in progress)", () => {
    const days = new Map([
      ["2026-07-07", 60],
      ["2026-07-08", 60],
      // today: no completed sessions yet (the one in progress doesn't count)
    ]);
    const { current } = computeFocusStreak(days, 60, "2026-07-09");
    expect(current).toBe(2);
  });

  it("longest streak can exceed the current one", () => {
    const days = new Map([
      ["2026-06-01", 60],
      ["2026-06-02", 60],
      ["2026-06-03", 60],
      ["2026-06-04", 60],
      // gap
      ["2026-07-09", 60],
    ]);
    const { current, longest } = computeFocusStreak(days, 60, "2026-07-09");
    expect(current).toBe(1);
    expect(longest).toBe(4);
  });
});
