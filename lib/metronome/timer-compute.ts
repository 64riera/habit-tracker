export type TimerRow = {
  status: "running" | "paused";
  durationSeconds: number;
  startedAt: string;
  lastResumedAt: string;
  accumulatedActiveSeconds: number;
};

export type TimerPatch = Partial<TimerRow>;

// Shared by the server action (lib/actions/metronome.ts) and the client's
// own pre-check (components/metronome/timer-panel.tsx, including the
// offline-queue path) — one source of truth for what counts as a valid
// duration, so a duration rejected offline would never have silently
// succeeded online either, and vice versa.
export const MIN_DURATION_SECONDS = 5;
export const MAX_DURATION_SECONDS = 6 * 60 * 60; // 6h — generous ceiling, not a real use case past this

export function isValidDuration(durationSeconds: number): boolean {
  const duration = Math.round(durationSeconds);
  return Number.isFinite(duration) && duration >= MIN_DURATION_SECONDS && duration <= MAX_DURATION_SECONDS;
}

/**
 * Pure — the whole point of this timer is that it doesn't depend on a
 * client-side counter that would reset if the app closes: `elapsedSeconds`
 * always derives the true elapsed time from real timestamps (persisted
 * server-side, see lib/actions/metronome.ts), so reopening the app after
 * any amount of time recomputes the correct value instead of resuming from
 * whatever a JS interval last happened to reach.
 */
export function elapsedSeconds(timer: TimerRow, now: Date): number {
  if (timer.status === "paused") return timer.accumulatedActiveSeconds;
  const sinceResume = (now.getTime() - new Date(timer.lastResumedAt).getTime()) / 1000;
  return timer.accumulatedActiveSeconds + Math.max(0, sinceResume);
}

export function remainingSeconds(timer: TimerRow, now: Date): number {
  return Math.max(0, timer.durationSeconds - elapsedSeconds(timer, now));
}

export function isFinished(timer: TimerRow, now: Date): boolean {
  return timer.status === "running" && remainingSeconds(timer, now) <= 0;
}

// Pure state transitions, reused both by the server action (the real
// mutation) and by the offline-queue's "ghost" preview (lib/offline/
// pending-selectors.ts) — so what a device previews while offline and what
// actually lands once the mutation syncs are computed by the exact same
// logic, never two hand-kept-in-sync copies of it.
export function applyPause(timer: TimerRow, now: Date): TimerPatch {
  return { status: "paused", accumulatedActiveSeconds: Math.round(elapsedSeconds(timer, now)) };
}

export function applyResume(now: Date): TimerPatch {
  return { status: "running", lastResumedAt: now.toISOString() };
}
