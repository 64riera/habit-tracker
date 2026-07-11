import { describe, expect, it } from "vitest";
import {
  applyEndBreakEarly,
  applyFinalize,
  applyPause,
  applyResume,
  computeFocusState,
  reconcileFocusSession,
  STOPWATCH_CAP_SECONDS,
  type FocusSessionRow,
} from "./compute";

const START = new Date("2026-07-09T10:00:00.000Z");

function iso(offsetSeconds: number, base: Date = START): string {
  return new Date(base.getTime() + offsetSeconds * 1000).toISOString();
}

function makeSession(overrides: Partial<FocusSessionRow> = {}): FocusSessionRow {
  return {
    id: "s1",
    userId: "u1",
    habitId: null,
    mode: "countdown",
    plannedDurationSeconds: 25 * 60,
    status: "running",
    startedAt: iso(0),
    lastResumedAt: iso(0),
    accumulatedActiveSeconds: 0,
    breaksEnabled: false,
    breakIntervalMinutes: null,
    breakDurationMinutes: null,
    breaksTakenCount: 0,
    breakStartedAt: null,
    pausedAt: null,
    completedAt: null,
    autoCompleted: false,
    date: "2026-07-09",
    createdAt: iso(0),
    ...overrides,
  };
}

describe("computeFocusState", () => {
  it("counts elapsed seconds while running", () => {
    const state = computeFocusState(makeSession(), new Date(iso(90)));
    expect(state.activeSeconds).toBe(90);
    expect(state.remainingSeconds).toBe(25 * 60 - 90);
    expect(state.overCap).toBe(false);
  });

  it("freezes elapsed seconds while paused, no matter how long it stays paused", () => {
    const session = makeSession({ status: "paused", accumulatedActiveSeconds: 120 });
    const state = computeFocusState(session, new Date(iso(999_999)));
    expect(state.activeSeconds).toBe(120);
  });
});

describe("reconcileFocusSession — countdown completion", () => {
  it("auto-completes exactly when the countdown reaches zero", () => {
    const session = makeSession({ plannedDurationSeconds: 25 * 60 });
    const { changed, session: result } = reconcileFocusSession(session, new Date(iso(25 * 60 + 5)));
    expect(changed).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.autoCompleted).toBe(true);
    expect(result.accumulatedActiveSeconds).toBe(25 * 60);
    expect(result.completedAt).toBe(iso(25 * 60));
  });

  it("does nothing before the countdown ends", () => {
    const session = makeSession({ plannedDurationSeconds: 25 * 60 });
    const { changed, session: result } = reconcileFocusSession(session, new Date(iso(60)));
    expect(changed).toBe(false);
    expect(result.status).toBe("running");
  });
});

describe("reconcileFocusSession — stopwatch hard cap", () => {
  it("auto-completes at the 2h cap even if the tab was closed for days", () => {
    const session = makeSession({ mode: "stopwatch", plannedDurationSeconds: null });
    const farFuture = new Date(iso(3 * 24 * 60 * 60)); // 3 days later
    const { changed, session: result } = reconcileFocusSession(session, farFuture);
    expect(changed).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.accumulatedActiveSeconds).toBe(STOPWATCH_CAP_SECONDS);
    expect(result.completedAt).toBe(iso(STOPWATCH_CAP_SECONDS));
  });
});

describe("manual pause/resume arithmetic", () => {
  it("freezes accumulated seconds on pause and keeps counting correctly after resume", () => {
    const session = makeSession();
    const pausePatch = applyPause(session, new Date(iso(300))); // 5 min in
    expect(pausePatch.accumulatedActiveSeconds).toBe(300);
    expect(pausePatch.status).toBe("paused");

    const paused = { ...session, ...pausePatch } as FocusSessionRow;
    const stateWhilePaused = computeFocusState(paused, new Date(iso(9999)));
    expect(stateWhilePaused.activeSeconds).toBe(300);

    const resumePatch = applyResume(new Date(iso(600))); // resumed at the 10 min mark
    const resumed = { ...paused, ...resumePatch } as FocusSessionRow;
    const stateAfterResume = computeFocusState(resumed, new Date(iso(660))); // 1 min after resuming
    expect(stateAfterResume.activeSeconds).toBe(300 + 60);
  });
});

describe("reconcileFocusSession — single active-break cycle", () => {
  it("enters an active break at the configured interval and resumes after its duration elapses", () => {
    const session = makeSession({
      plannedDurationSeconds: 60 * 60,
      breaksEnabled: true,
      breakIntervalMinutes: 20,
      breakDurationMinutes: 5,
    });

    const afterThreshold = reconcileFocusSession(session, new Date(iso(20 * 60 + 30)));
    expect(afterThreshold.session.status).toBe("on_break");
    expect(afterThreshold.session.accumulatedActiveSeconds).toBe(20 * 60);
    expect(afterThreshold.session.breakStartedAt).toBe(iso(20 * 60));
    expect(afterThreshold.session.breaksTakenCount).toBe(1);

    const afterBreakEnds = reconcileFocusSession(afterThreshold.session, new Date(iso(20 * 60 + 5 * 60 + 45)));
    expect(afterBreakEnds.session.status).toBe("running");
    expect(afterBreakEnds.session.lastResumedAt).toBe(iso(20 * 60 + 5 * 60));
    expect(afterBreakEnds.session.breakStartedAt).toBeNull();
  });
});

describe("reconcileFocusSession — multi-hop reconciliation after a long absence", () => {
  it("walks through several break cycles and lands on the final cap in a single call", () => {
    const session = makeSession({
      plannedDurationSeconds: 4 * 60 * 60, // 4h, the maximum allowed cap
      breaksEnabled: true,
      breakIntervalMinutes: 60,
      breakDurationMinutes: 10,
    });

    // The browser closes at minute 0 and reopens 6 hours later.
    const { changed, session: result } = reconcileFocusSession(session, new Date(iso(6 * 60 * 60)));

    expect(changed).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.autoCompleted).toBe(true);
    expect(result.accumulatedActiveSeconds).toBe(4 * 60 * 60);
    // 3 active breaks (at 60/120/180 min of active focus); the 4th coincides
    // with the 4h cap and the session closes there instead of opening another break.
    expect(result.breaksTakenCount).toBe(3);
    // 4h of focus + 3 breaks of 10 min = 4h30min of real clock time until completion.
    expect(result.completedAt).toBe(iso(4 * 60 * 60 + 3 * 10 * 60));
  });
});

describe("reconcileFocusSession — break duration of 0 minutes is reminder-only", () => {
  it("never leaves running, just counts reminders without stopping the clock", () => {
    const session = makeSession({
      plannedDurationSeconds: 60 * 60,
      breaksEnabled: true,
      breakIntervalMinutes: 20,
      breakDurationMinutes: 0,
    });

    const { changed, session: result } = reconcileFocusSession(session, new Date(iso(45 * 60)));
    expect(changed).toBe(true);
    expect(result.status).toBe("running");
    expect(result.breaksTakenCount).toBe(2); // 20 and 40 min thresholds already crossed
    expect(result.breakStartedAt).toBeNull();

    const state = computeFocusState(result, new Date(iso(45 * 60)));
    expect(state.activeSeconds).toBe(45 * 60); // the clock never stopped
  });
});

describe("reconcileFocusSession — crossing midnight/day cutoff", () => {
  it("computes elapsed seconds from pure timestamps, unaffected by the calendar day or the day-cutoff", () => {
    const lateNightStart = new Date("2026-07-09T23:50:00.000Z");
    const session = makeSession({
      plannedDurationSeconds: 40 * 60,
      startedAt: lateNightStart.toISOString(),
      lastResumedAt: lateNightStart.toISOString(),
      date: "2026-07-09", // fixed at start; compute.ts never touches or recomputes it
    });

    const afterMidnight = new Date(lateNightStart.getTime() + 30 * 60 * 1000);
    const state = computeFocusState(session, afterMidnight);
    expect(state.activeSeconds).toBe(30 * 60);
    expect(state.overCap).toBe(false);
    expect(session.date).toBe("2026-07-09");
  });
});

describe("applyFinalize", () => {
  it("caps the final tally at the mode's max even if the finalize call comes in late", () => {
    const session = makeSession({ mode: "stopwatch", plannedDurationSeconds: null });
    const patch = applyFinalize(session, new Date(iso(3 * 60 * 60)), "completed");
    expect(patch.accumulatedActiveSeconds).toBe(STOPWATCH_CAP_SECONDS);
    expect(patch.status).toBe("completed");
  });

  it("cancels with exactly the partial active time reached so far", () => {
    const session = makeSession({ plannedDurationSeconds: 25 * 60 });
    const patch = applyFinalize(session, new Date(iso(10 * 60)), "cancelled");
    expect(patch.accumulatedActiveSeconds).toBe(10 * 60);
    expect(patch.status).toBe("cancelled");
  });
});

describe("applyEndBreakEarly", () => {
  it("resumes running immediately and clears breakStartedAt", () => {
    const patch = applyEndBreakEarly(new Date(iso(500)));
    expect(patch.status).toBe("running");
    expect(patch.lastResumedAt).toBe(iso(500));
    expect(patch.breakStartedAt).toBeNull();
  });
});
