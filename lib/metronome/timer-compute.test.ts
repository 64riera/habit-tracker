import { describe, expect, it } from "vitest";
import { elapsedSeconds, remainingSeconds, isFinished, type TimerRow } from "./timer-compute";

function timer(overrides: Partial<TimerRow> = {}): TimerRow {
  return {
    status: "running",
    durationSeconds: 300,
    startedAt: "2026-07-14T10:00:00.000Z",
    lastResumedAt: "2026-07-14T10:00:00.000Z",
    accumulatedActiveSeconds: 0,
    ...overrides,
  };
}

describe("elapsedSeconds", () => {
  it("counts time since lastResumedAt while running", () => {
    const t = timer();
    const now = new Date("2026-07-14T10:01:00.000Z"); // 60s later
    expect(elapsedSeconds(t, now)).toBe(60);
  });

  it("adds to previously accumulated time (e.g. after a resume)", () => {
    const t = timer({ accumulatedActiveSeconds: 40, lastResumedAt: "2026-07-14T10:02:00.000Z" });
    const now = new Date("2026-07-14T10:02:30.000Z"); // 30s since resume
    expect(elapsedSeconds(t, now)).toBe(70);
  });

  it("ignores time passing while paused — only the frozen accumulated value counts", () => {
    const t = timer({ status: "paused", accumulatedActiveSeconds: 45 });
    const now = new Date("2026-07-14T12:00:00.000Z"); // hours later
    expect(elapsedSeconds(t, now)).toBe(45);
  });

  it("survives a long gap as if the app had been closed the whole time", () => {
    // This is the whole point of the feature: no client-side interval ever
    // ran during this gap, yet the elapsed time is still correct because
    // it's derived purely from the stored timestamp.
    const t = timer({ startedAt: "2026-07-14T10:00:00.000Z", lastResumedAt: "2026-07-14T10:00:00.000Z" });
    const now = new Date("2026-07-14T10:04:00.000Z"); // 4 minutes later, "app was closed"
    expect(elapsedSeconds(t, now)).toBe(240);
  });
});

describe("remainingSeconds", () => {
  it("counts down from durationSeconds", () => {
    const t = timer({ durationSeconds: 300 });
    const now = new Date("2026-07-14T10:01:00.000Z");
    expect(remainingSeconds(t, now)).toBe(240);
  });

  it("never goes below 0", () => {
    const t = timer({ durationSeconds: 60 });
    const now = new Date("2026-07-14T10:05:00.000Z"); // way past duration
    expect(remainingSeconds(t, now)).toBe(0);
  });
});

describe("isFinished", () => {
  it("is false while there's time left", () => {
    const t = timer({ durationSeconds: 300 });
    expect(isFinished(t, new Date("2026-07-14T10:01:00.000Z"))).toBe(false);
  });

  it("is true once elapsed reaches the duration, even after a long gap", () => {
    const t = timer({ durationSeconds: 60 });
    expect(isFinished(t, new Date("2026-07-14T11:00:00.000Z"))).toBe(true);
  });

  it("is false while paused, regardless of elapsed time", () => {
    const t = timer({ status: "paused", durationSeconds: 60, accumulatedActiveSeconds: 60 });
    expect(isFinished(t, new Date("2026-07-14T11:00:00.000Z"))).toBe(false);
  });
});
