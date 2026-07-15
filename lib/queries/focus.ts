import "server-only";
import { cache } from "react";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { focusRewardTiers, focusSessions, focusSettings, habitLogs, habits } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { LIVE_STATUSES, computeFocusState, reconcileFocusSession, type FocusSessionRow } from "@/lib/focus/compute";
import { shouldAutoCompleteHabit } from "@/lib/focus/habit-autocomplete";
import { computeNewRewardTiers, type FocusRewardTier } from "@/lib/focus/rewards";
import { writeHabitLog } from "@/lib/habits/log-write";

export type { FocusSessionRow };
export type FocusSettingsRow = typeof focusSettings.$inferSelect;

const DEFAULT_FOCUS_SETTINGS: Omit<FocusSettingsRow, "userId"> = {
  dailyGoalMinutes: 60,
  defaultMode: "countdown",
  defaultDurationMinutes: 25,
  breaksEnabled: false,
  breakIntervalMinutes: 25,
  breakDurationMinutes: 5,
  soundEnabled: true,
};

async function getFocusRewardLifetimeTotals(userId: string): Promise<{ totalSeconds: number; count: number }> {
  const [row] = await db
    .select({
      totalSeconds: sql<number>`coalesce(sum(${focusSessions.accumulatedActiveSeconds}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, userId), eq(focusSessions.status, "completed")));
  return { totalSeconds: Number(row?.totalSeconds ?? 0), count: Number(row?.count ?? 0) };
}

/**
 * Checks and unlocks new reward tiers. Called only right after a session
 * transitions to "completed" (never "cancelled" — those don't count), from
 * the two paths that can leave it in that state: automatic reconciliation
 * (`reconcileAndPersist` below) and the manual "Finish" button
 * (`transition()` in `lib/actions/focus.ts`).
 */
export async function checkAndUnlockFocusRewards(userId: string): Promise<FocusRewardTier[]> {
  const [{ totalSeconds, count }, unlockedRows] = await Promise.all([
    getFocusRewardLifetimeTotals(userId),
    db.select({ tier: focusRewardTiers.tier }).from(focusRewardTiers).where(eq(focusRewardTiers.userId, userId)),
  ]);

  const newTiers = computeNewRewardTiers({
    totalCompletedFocusSeconds: totalSeconds,
    completedSessionCount: count,
    alreadyUnlockedTiers: new Set(unlockedRows.map((r) => r.tier as FocusRewardTier)),
  });

  if (newTiers.length > 0) {
    await db.insert(focusRewardTiers).values(newTiers.map((tier) => ({ id: nanoid(), userId, tier })));
  }
  return newTiers;
}

/**
 * A focus session linked to a habit marks that habit "done" for its day as
 * soon as enough active time has gone in — independent of the session's own
 * cap or manual finish (a 90-minute stopwatch tied to a 20-minute binary
 * habit shouldn't have to run the full 90 minutes). See
 * habitAutoCompleteThresholdSeconds for the per-goal-type rule; quantitative
 * habits have no rule and are left alone. Checking the day's existing log
 * first keeps this idempotent across repeated reconciliations and avoids
 * re-forcing "done" back on if the user manually unmarks it later in the
 * same session.
 */
async function autoCompleteLinkedHabitIfDue(session: FocusSessionRow, now: Date): Promise<void> {
  const habitId = session.habitId;
  if (!habitId) return;

  const [habit] = await db
    .select({ goalType: habits.goalType, goalTarget: habits.goalTarget })
    .from(habits)
    .where(eq(habits.id, habitId))
    .limit(1);
  if (!habit) return;

  const activeSeconds = computeFocusState(session, now).activeSeconds;
  if (!shouldAutoCompleteHabit(activeSeconds, habit)) return;

  const [existingLog] = await db
    .select({ status: habitLogs.status })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, session.date)))
    .limit(1);
  if (existingLog?.status === "done") return;

  await writeHabitLog(session.userId, { habitId, date: session.date, status: "done" });
}

/** Persists the result of reconciling against `now` (if there were changes) and applies the
 * linked-habit auto-completion check, returning the now-up-to-date row along with any reward
 * newly unlocked by that reconciliation. */
export async function reconcileAndPersist(
  row: FocusSessionRow,
  now: Date
): Promise<{ session: FocusSessionRow; unlockedTiers: FocusRewardTier[] }> {
  const { changed, session } = reconcileFocusSession(row, now);

  if (changed) {
    await db
      .update(focusSessions)
      .set({
        status: session.status,
        accumulatedActiveSeconds: session.accumulatedActiveSeconds,
        lastResumedAt: session.lastResumedAt,
        breakStartedAt: session.breakStartedAt,
        breaksTakenCount: session.breaksTakenCount,
        pausedAt: session.pausedAt,
        completedAt: session.completedAt,
        autoCompleted: session.autoCompleted,
      })
      .where(eq(focusSessions.id, session.id));
  }

  if (session.habitId) {
    await autoCompleteLinkedHabitIfDue(session, now);
  }

  const unlockedTiers = changed && session.status === "completed" ? await checkAndUnlockFocusRewards(session.userId) : [];
  return { session, unlockedTiers };
}

/**
 * Single entry point for reading the user's "active session" along with
 * any reward unlocked within this same call: if it exists, it's reconciled
 * against the current instant before being returned, so it can already
 * come back with status "completed" if the time cap or an active pause
 * expired while nobody was watching. This is the chokepoint that makes
 * focus "keep running" even if the browser was closed.
 */
// Memoized with cache(): reconcileAndPersist can write to the row (status
// transitions, habit auto-completion, reward unlocks) as a side effect, so
// beyond saving a redundant read, this also avoids reconciling — and
// writing — the same session twice in one request just because both a
// layout and its page (or several sections) ask for it independently.
export const getActiveFocusSessionWithRewards = cache(
  async (): Promise<{
    session: FocusSessionRow;
    unlockedTiers: FocusRewardTier[];
  } | null> => {
    const userId = await getCurrentUserId();
    const [row] = await db
      .select()
      .from(focusSessions)
      .where(and(eq(focusSessions.userId, userId), inArray(focusSessions.status, LIVE_STATUSES)))
      .limit(1);
    if (!row) return null;
    return reconcileAndPersist(row, new Date());
  }
);

export const getActiveFocusSession = cache(async (): Promise<FocusSessionRow | null> => {
  const result = await getActiveFocusSessionWithRewards();
  return result?.session ?? null;
});

/**
 * Minimal data any screen needs to display the ongoing focus state — via
 * `FocusHeaderChip` (header) or `MiniFocusIndicator` (floating). Single
 * read point for both instead of repeating the same
 * `Promise.all([getActiveFocusSession(), getFocusSettings()])` in every
 * layout/page that needs it.
 */
export type FocusHeaderData = { session: FocusSessionRow | null; soundEnabled: boolean };

export const getFocusHeaderData = cache(async (): Promise<FocusHeaderData> => {
  const [session, settings] = await Promise.all([getActiveFocusSession(), getFocusSettings()]);
  return { session, soundEnabled: settings.soundEnabled };
});

export const getFocusSettings = cache(async (): Promise<FocusSettingsRow> => {
  const userId = await getCurrentUserId();
  const [row] = await db.select().from(focusSettings).where(eq(focusSettings.userId, userId)).limit(1);
  return row ?? { userId, ...DEFAULT_FOCUS_SETTINGS };
});

export async function getFocusHistory(params: {
  habitId?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<FocusSessionRow[]> {
  const { habitId, categoryId, limit = 30, offset = 0 } = params;
  const userId = await getCurrentUserId();
  const conditions = [eq(focusSessions.userId, userId), inArray(focusSessions.status, ["completed", "cancelled"])];
  if (habitId) conditions.push(eq(focusSessions.habitId, habitId));
  if (categoryId) conditions.push(eq(focusSessions.categoryId, categoryId));
  return db
    .select()
    .from(focusSessions)
    .where(and(...conditions))
    .orderBy(desc(focusSessions.startedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Daily goal progress. Receives the active session already resolved by the
 * caller (instead of re-reading it) because `/focus` already fetched it via
 * `getActiveFocusSession()` to decide which UI to show — avoiding a second
 * query+reconciliation of the same row. If that session belongs to the
 * queried day, its in-progress active time (computed on the fly, not
 * persisted) is added to the already-completed total, so today's goal
 * advances live while the session keeps running.
 */
export async function getTodayFocusProgress(
  date: string,
  activeSession: FocusSessionRow | null
): Promise<{ completedSeconds: number; goalMinutes: number }> {
  const userId = await getCurrentUserId();
  const [rows, settings] = await Promise.all([
    db
      .select({ accumulatedActiveSeconds: focusSessions.accumulatedActiveSeconds })
      .from(focusSessions)
      .where(
        and(eq(focusSessions.userId, userId), eq(focusSessions.date, date), eq(focusSessions.status, "completed"))
      ),
    getFocusSettings(),
  ]);
  const completedSeconds = rows.reduce((sum, r) => sum + r.accumulatedActiveSeconds, 0);
  const liveSeconds =
    activeSession && activeSession.date === date && LIVE_STATUSES.includes(activeSession.status)
      ? computeFocusState(activeSession, new Date()).activeSeconds
      : 0;
  return { completedSeconds: completedSeconds + liveSeconds, goalMinutes: settings.dailyGoalMinutes };
}

export type FocusRewardProgress = {
  totalCompletedSeconds: number;
  completedSessionCount: number;
  unlockedTiers: FocusRewardTier[];
};

/** For the /focus/forest screen: lifetime totals + which tiers are already unlocked. */
export async function getFocusRewardProgress(): Promise<FocusRewardProgress> {
  const userId = await getCurrentUserId();
  const [{ totalSeconds, count }, unlockedRows] = await Promise.all([
    getFocusRewardLifetimeTotals(userId),
    db.select({ tier: focusRewardTiers.tier }).from(focusRewardTiers).where(eq(focusRewardTiers.userId, userId)),
  ]);
  return {
    totalCompletedSeconds: totalSeconds,
    completedSessionCount: count,
    unlockedTiers: unlockedRows.map((r) => r.tier as FocusRewardTier),
  };
}
