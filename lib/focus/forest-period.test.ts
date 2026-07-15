import { describe, expect, it } from "vitest";
import { buildPeriodTrees, dailyTrendFromSessions, monthlyTrendFromDaily, yearHeatmapCells } from "./forest-period";

describe("buildPeriodTrees", () => {
  it("maps each session to a tree sized by its own duration", () => {
    const trees = buildPeriodTrees([
      { startedAt: "2026-07-01T10:00:00.000Z", date: "2026-07-01", accumulatedActiveSeconds: 60 * 10 },
      { startedAt: "2026-07-02T10:00:00.000Z", date: "2026-07-02", accumulatedActiveSeconds: 60 * 130 },
    ]);
    expect(trees).toEqual([
      { id: "2026-07-01T10:00:00.000Z", date: "2026-07-01", minutes: 10, size: "seed" },
      { id: "2026-07-02T10:00:00.000Z", date: "2026-07-02", minutes: 130, size: "mature_tree" },
    ]);
  });

  it("returns an empty grid for no sessions", () => {
    expect(buildPeriodTrees([])).toEqual([]);
  });
});

describe("dailyTrendFromSessions", () => {
  it("zero-fills days with no sessions and sums same-day sessions", () => {
    const trend = dailyTrendFromSessions(
      [
        { date: "2026-07-01", accumulatedActiveSeconds: 60 * 20 },
        { date: "2026-07-01", accumulatedActiveSeconds: 60 * 10 },
        { date: "2026-07-03", accumulatedActiveSeconds: 60 * 5 },
      ],
      "2026-07-01",
      "2026-07-03"
    );
    expect(trend).toEqual([
      { date: "2026-07-01", minutes: 30 },
      { date: "2026-07-02", minutes: 0 },
      { date: "2026-07-03", minutes: 5 },
    ]);
  });
});

describe("monthlyTrendFromDaily", () => {
  it("groups daily totals into monthly buckets, zero-filling empty months", () => {
    const trend = monthlyTrendFromDaily(
      [
        { date: "2026-01-05", minutes: 30 },
        { date: "2026-01-20", minutes: 15 },
        { date: "2026-03-01", minutes: 40 },
      ],
      "2026-01-01",
      "2026-03-31"
    );
    expect(trend).toEqual([
      { monthKey: "2026-01", minutes: 45 },
      { monthKey: "2026-02", minutes: 0 },
      { monthKey: "2026-03", minutes: 40 },
    ]);
  });

  it("handles a range spanning a year boundary", () => {
    const trend = monthlyTrendFromDaily([{ date: "2025-12-15", minutes: 10 }], "2025-12-01", "2026-01-31");
    expect(trend.map((t) => t.monthKey)).toEqual(["2025-12", "2026-01"]);
  });
});

describe("yearHeatmapCells", () => {
  it("buckets minutes into levels relative to the daily goal", () => {
    const dailyTotals = new Map([
      ["2026-07-01", 0], // level 0
      ["2026-07-02", 10], // ratio 0.166 -> level 1
      ["2026-07-03", 25], // ratio 0.416 -> level 2
      ["2026-07-04", 45], // ratio 0.75 -> level 3
      ["2026-07-05", 60], // ratio 1 -> level 4
    ]);
    const cells = yearHeatmapCells(dailyTotals, "2026-07-01", "2026-07-05", 60);
    expect(cells.map((c) => c.level)).toEqual([0, 1, 2, 3, 4]);
    expect(cells.every((c) => c.allJustified === false)).toBe(true);
  });

  it("treats a zero goal as any activity counting as full", () => {
    const dailyTotals = new Map([
      ["2026-07-01", 0],
      ["2026-07-02", 5],
    ]);
    const cells = yearHeatmapCells(dailyTotals, "2026-07-01", "2026-07-02", 0);
    expect(cells.map((c) => c.level)).toEqual([0, 4]);
  });
});
