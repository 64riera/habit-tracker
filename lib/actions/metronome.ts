"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { metronomeTimers } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { getActiveTimer } from "@/lib/queries/metronome";
import { elapsedSeconds } from "@/lib/metronome/timer-compute";
import type { TimerRow } from "@/lib/metronome/timer-compute";

const MIN_DURATION_SECONDS = 5;
const MAX_DURATION_SECONDS = 6 * 60 * 60; // 6h — generous ceiling, not a real use case past this

/**
 * Read-only RPC for the client's ticking hook (see
 * components/metronome/use-live-timer.ts) — called on mount, on regaining
 * visibility/focus, and on reconnect, so the displayed countdown is always
 * resynced against the server's own timestamps instead of trusting however
 * long the client happened to be away.
 */
export async function getActiveTimerAction(): Promise<TimerRow | null> {
  return getActiveTimer();
}

/** Starts a fresh countdown, replacing any existing one for this account —
 * there's only ever one active timer per account (see the table's
 * comment), a new start always wins. */
export async function startTimer(durationSeconds: number): Promise<TimerRow | null> {
  const duration = Math.round(durationSeconds);
  if (!Number.isFinite(duration) || duration < MIN_DURATION_SECONDS || duration > MAX_DURATION_SECONDS) return null;

  const userId = await getCurrentUserId();
  const nowIso = new Date().toISOString();
  await db
    .insert(metronomeTimers)
    .values({
      userId,
      status: "running",
      durationSeconds: duration,
      startedAt: nowIso,
      lastResumedAt: nowIso,
      accumulatedActiveSeconds: 0,
    })
    .onConflictDoUpdate({
      target: metronomeTimers.userId,
      set: { status: "running", durationSeconds: duration, startedAt: nowIso, lastResumedAt: nowIso, accumulatedActiveSeconds: 0 },
    });

  return getActiveTimer();
}

export async function pauseTimer(): Promise<TimerRow | null> {
  const userId = await getCurrentUserId();
  const timer = await getActiveTimer();
  if (!timer || timer.status !== "running") return timer;

  const now = new Date();
  await db
    .update(metronomeTimers)
    .set({ status: "paused", accumulatedActiveSeconds: Math.round(elapsedSeconds(timer, now)) })
    .where(eq(metronomeTimers.userId, userId));

  return getActiveTimer();
}

export async function resumeTimer(): Promise<TimerRow | null> {
  const userId = await getCurrentUserId();
  const nowIso = new Date().toISOString();
  await db
    .update(metronomeTimers)
    .set({ status: "running", lastResumedAt: nowIso })
    .where(and(eq(metronomeTimers.userId, userId), eq(metronomeTimers.status, "paused")));

  return getActiveTimer();
}

/** Clears the timer entirely — used both for an explicit "cancel" and to
 * dismiss a finished countdown (there's nothing to keep once it's done:
 * this utility has no history/stats, unlike Focus sessions). */
export async function cancelTimer(): Promise<void> {
  const userId = await getCurrentUserId();
  await db.delete(metronomeTimers).where(eq(metronomeTimers.userId, userId));
}
