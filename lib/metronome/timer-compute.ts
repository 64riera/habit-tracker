export type TimerRow = {
  status: "running" | "paused";
  durationSeconds: number;
  startedAt: string;
  lastResumedAt: string;
  accumulatedActiveSeconds: number;
};

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
