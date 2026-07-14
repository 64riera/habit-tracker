import { describe, expect, it } from "vitest";
import {
  parseWeight,
  sessionVolume,
  overallSessionCounts,
  getGymWeekSummary,
  gymTrend,
  exerciseBreakdown,
  gymStreak,
} from "./stats";
import type { GymSessionRow } from "@/lib/queries/gym";

function session(id: string, date: string, exercises: GymSessionRow["exercises"]): GymSessionRow {
  return { id, userId: "u1", date, exercises, createdAt: `${date}T00:00:00.000Z` };
}

describe("parseWeight", () => {
  it("parses a plain number", () => {
    expect(parseWeight("12.5")).toBe(12.5);
  });

  it("sums '+'-separated stack/plate notation", () => {
    expect(parseWeight("43+5")).toBe(48);
  });

  it("is null for bodyweight (no weight) sets", () => {
    expect(parseWeight(undefined)).toBeNull();
    expect(parseWeight("")).toBeNull();
  });

  it("is null for unparseable text", () => {
    expect(parseWeight("mucho")).toBeNull();
  });
});

describe("sessionVolume", () => {
  it("sums weight × reps across sets, treating bodyweight sets as 0", () => {
    const s = session("s1", "2026-07-13", [
      { exerciseId: "pecho-inclinado", sets: [{ weight: "12.5", reps: 12 }, { weight: "12.5", reps: 10 }] },
      { exerciseId: "dominadas", sets: [{ reps: 8 }] },
    ]);
    expect(sessionVolume(s)).toBe(12.5 * 12 + 12.5 * 10);
  });
});

describe("overallSessionCounts", () => {
  it("counts sessions within each trailing window", () => {
    const sessions = [
      session("s1", "2026-07-14", []),
      session("s2", "2026-07-01", []),
      session("s3", "2026-06-01", []),
      session("s4", "2026-01-01", []),
    ];
    const counts = overallSessionCounts(sessions, "2026-07-14");
    expect(counts.sessions7).toBe(1);
    expect(counts.sessions30).toBe(2);
    expect(counts.sessions90).toBe(3);
  });
});

describe("getGymWeekSummary", () => {
  it("compares this week's volume against last week's", () => {
    // 2026-07-13 is a Monday.
    const sessions = [
      session("s1", "2026-07-13", [{ exerciseId: "press", sets: [{ weight: "20", reps: 10 }] }]), // this week
      session("s2", "2026-07-06", [{ exerciseId: "press", sets: [{ weight: "20", reps: 5 }] }]), // last week
    ];
    const summary = getGymWeekSummary(sessions, "2026-07-14");
    expect(summary.current.volume).toBe(200);
    expect(summary.previous.volume).toBe(100);
    expect(summary.volumeChange).toBe(100);
  });
});

describe("gymTrend", () => {
  it("zero-fills days with no session in the range", () => {
    const sessions = [session("s1", "2026-07-13", [{ exerciseId: "press", sets: [{ weight: "10", reps: 10 }] }])];
    const trend = gymTrend(sessions, "2026-07-14", 3);
    expect(trend).toEqual([
      { date: "2026-07-12", volume: 0 },
      { date: "2026-07-13", volume: 100 },
      { date: "2026-07-14", volume: 0 },
    ]);
  });
});

describe("exerciseBreakdown", () => {
  it("aggregates by exerciseId across sessions", () => {
    const sessions = [
      session("s1", "2026-07-13", [{ exerciseId: "press-militar", sets: [{ weight: "29", reps: 10 }] }]),
      session("s2", "2026-07-06", [{ exerciseId: "press-militar", sets: [{ weight: "23", reps: 8 }] }]),
    ];
    const breakdown = exerciseBreakdown(sessions);
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].exerciseId).toBe("press-militar");
    expect(breakdown[0].setCount).toBe(2);
    expect(breakdown[0].sessionCount).toBe(2);
    expect(breakdown[0].bestWeight).toBe(29);
  });

  it("tracks the best weight and best reps independently", () => {
    const sessions = [
      session("s1", "2026-07-13", [
        { exerciseId: "press-militar", sets: [{ weight: "29", reps: 10 }, { weight: "23", reps: 12 }] },
      ]),
    ];
    const [stat] = exerciseBreakdown(sessions);
    expect(stat.bestWeight).toBe(29);
    expect(stat.bestReps).toBe(12);
  });

  it("keeps different exercises as separate entries", () => {
    const sessions = [
      session("s1", "2026-07-13", [
        { exerciseId: "press-militar", sets: [{ weight: "29", reps: 10 }] },
        { exerciseId: "dominadas", sets: [{ reps: 8 }] },
      ]),
    ];
    const breakdown = exerciseBreakdown(sessions);
    expect(breakdown).toHaveLength(2);
  });
});

describe("gymStreak", () => {
  it("counts consecutive weeks with at least one session, including an in-progress current week", () => {
    // 2026-07-13 (Mon) starts this week; today is 2026-07-14 (Tue).
    const sessions = [
      session("s1", "2026-07-14", []), // this week
      session("s2", "2026-07-08", []), // last week
      session("s3", "2026-06-29", []), // two weeks ago
    ];
    expect(gymStreak(sessions, "2026-07-14").current).toBe(3);
  });

  it("doesn't break the streak just because the current week has no session yet", () => {
    const sessions = [session("s1", "2026-07-08", [])]; // last week only
    expect(gymStreak(sessions, "2026-07-14").current).toBe(1);
  });

  it("resets to 0 when the most recent session isn't this week or last week", () => {
    const sessions = [session("s1", "2026-06-01", [])];
    expect(gymStreak(sessions, "2026-07-14").current).toBe(0);
  });
});
