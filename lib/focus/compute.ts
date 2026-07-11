import type { focusSessions } from "@/lib/db/schema";

export type FocusSessionRow = typeof focusSessions.$inferSelect;
export type FocusSessionStatus = FocusSessionRow["status"];

export const LIVE_STATUSES: FocusSessionStatus[] = ["running", "on_break", "paused"];

export const COUNTDOWN_MIN_MINUTES = 1;
export const COUNTDOWN_MAX_MINUTES = 240;
export const STOPWATCH_CAP_MINUTES = 120;
export const STOPWATCH_CAP_SECONDS = STOPWATCH_CAP_MINUTES * 60;
export const BREAK_INTERVAL_MIN_MINUTES = 20;
export const BREAK_INTERVAL_MAX_MINUTES = 60;
export const BREAK_DURATION_MIN_MINUTES = 0;
export const BREAK_DURATION_MAX_MINUTES = 10;

export type FocusStateView = {
  activeSeconds: number;
  remainingSeconds: number | null;
  capSeconds: number;
  overCap: boolean;
  dueForBreak: boolean;
  breakOver: boolean;
  /** Seconds remaining in the current active break; `null` if not on break. */
  breakRemainingSeconds: number | null;
};

export type FocusSessionPatch = Partial<
  Pick<
    FocusSessionRow,
    | "status"
    | "accumulatedActiveSeconds"
    | "lastResumedAt"
    | "breakStartedAt"
    | "breaksTakenCount"
    | "pausedAt"
    | "completedAt"
    | "autoCompleted"
  >
>;

function secondsBetween(fromIso: string, toMs: number): number {
  return Math.max(0, Math.floor((toMs - Date.parse(fromIso)) / 1000));
}

function addSeconds(iso: string, seconds: number): string {
  return new Date(Date.parse(iso) + Math.max(0, seconds) * 1000).toISOString();
}

function nextBreakThresholdSeconds(session: FocusSessionRow): number | null {
  if (!session.breaksEnabled || !session.breakIntervalMinutes) return null;
  return (session.breaksTakenCount + 1) * session.breakIntervalMinutes * 60;
}

/**
 * Pure computation (no I/O) of a session's derived state at instant `now`.
 * The server never stores "elapsed time": this is always recomputed from
 * timestamps, so a session "keeps running" even if nobody had the tab open
 * in the meantime.
 */
export function computeFocusState(session: FocusSessionRow, now: Date): FocusStateView {
  const nowMs = now.getTime();
  const activeSeconds =
    session.status === "running"
      ? session.accumulatedActiveSeconds + secondsBetween(session.lastResumedAt, nowMs)
      : session.accumulatedActiveSeconds;

  const capSeconds = session.mode === "countdown" ? session.plannedDurationSeconds ?? 0 : STOPWATCH_CAP_SECONDS;
  const overCap = activeSeconds >= capSeconds;
  const remainingSeconds = session.mode === "countdown" ? Math.max(0, capSeconds - activeSeconds) : null;

  // A break threshold is only "due" if it falls before the session's cap —
  // if it already coincides with or exceeds the cap, the cap closure wins,
  // not the break. The comparison uses "naive" `activeSeconds` (as if there
  // had never been any breaks) only to detect that the threshold has
  // already passed; the exact value at which it occurred is reconstructed
  // separately in reconcileFocusSession.
  const threshold = nextBreakThresholdSeconds(session);
  const dueForBreak =
    session.status === "running" && threshold !== null && activeSeconds >= threshold && threshold < capSeconds;

  const breakOver =
    session.status === "on_break" &&
    session.breakStartedAt !== null &&
    session.breakDurationMinutes !== null &&
    secondsBetween(session.breakStartedAt, nowMs) >= session.breakDurationMinutes * 60;

  const breakRemainingSeconds =
    session.status === "on_break" && session.breakStartedAt !== null && session.breakDurationMinutes !== null
      ? Math.max(0, session.breakDurationMinutes * 60 - secondsBetween(session.breakStartedAt, nowMs))
      : null;

  return { activeSeconds, remainingSeconds, capSeconds, overCap, dueForBreak, breakOver, breakRemainingSeconds };
}

export type FocusReconciliation = { changed: boolean; session: FocusSessionRow };

const MAX_RECONCILE_STEPS = 1000;

/**
 * Recomputes a session's state against `now`, applying in a chain all the
 * transitions that "should have" happened while nobody was looking (active
 * breaks crossed, time cap reached). It's a loop, not a single `if`,
 * because after a long absence several hops may be missing before reaching
 * the real state. It always terminates because `overCap` eventually becomes true.
 */
export function reconcileFocusSession(row: FocusSessionRow, now: Date): FocusReconciliation {
  if (row.status === "completed" || row.status === "cancelled") {
    return { changed: false, session: row };
  }

  let session = row;
  let changed = false;

  for (let step = 0; step < MAX_RECONCILE_STEPS; step++) {
    const state = computeFocusState(session, now);

    // Pending breaks are resolved before the cap closure: a break
    // threshold closer in time "occurred" before the cap, even though the
    // naive computation of `activeSeconds` (which assumes the session ran
    // with no breaks) may already look like it's past both at once.
    if (session.status === "running" && state.dueForBreak) {
      const threshold = nextBreakThresholdSeconds(session)!;
      const isReminderOnly = (session.breakDurationMinutes ?? 0) === 0;
      session = isReminderOnly
        ? { ...session, breaksTakenCount: session.breaksTakenCount + 1 }
        : {
            ...session,
            status: "on_break",
            accumulatedActiveSeconds: threshold,
            breakStartedAt: addSeconds(session.lastResumedAt, threshold - session.accumulatedActiveSeconds),
            breaksTakenCount: session.breaksTakenCount + 1,
          };
      changed = true;
      continue;
    }

    if (state.overCap) {
      const completedAt =
        session.status === "running"
          ? addSeconds(session.lastResumedAt, state.capSeconds - session.accumulatedActiveSeconds)
          : now.toISOString();
      session = {
        ...session,
        status: "completed",
        accumulatedActiveSeconds: state.capSeconds,
        completedAt,
        autoCompleted: true,
      };
      changed = true;
      break;
    }

    if (session.status === "on_break" && state.breakOver) {
      session = {
        ...session,
        status: "running",
        lastResumedAt: addSeconds(session.breakStartedAt!, (session.breakDurationMinutes ?? 0) * 60),
        breakStartedAt: null,
      };
      changed = true;
      continue;
    }

    break;
  }

  return { changed, session };
}

export function applyPause(session: FocusSessionRow, now: Date): FocusSessionPatch {
  return {
    status: "paused",
    accumulatedActiveSeconds: computeFocusState(session, now).activeSeconds,
    pausedAt: now.toISOString(),
  };
}

export function applyResume(now: Date): FocusSessionPatch {
  return { status: "running", lastResumedAt: now.toISOString(), pausedAt: null };
}

export function applyEndBreakEarly(now: Date): FocusSessionPatch {
  return { status: "running", lastResumedAt: now.toISOString(), breakStartedAt: null };
}

export function applyFinalize(
  session: FocusSessionRow,
  now: Date,
  outcome: "completed" | "cancelled"
): FocusSessionPatch {
  const state = computeFocusState(session, now);
  return {
    status: outcome,
    accumulatedActiveSeconds: Math.min(state.activeSeconds, state.capSeconds),
    completedAt: now.toISOString(),
    autoCompleted: false,
  };
}
