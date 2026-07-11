import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { focusRewardTiers, focusSessions, focusSettings } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { LIVE_STATUSES, computeFocusState, reconcileFocusSession, type FocusSessionRow } from "@/lib/focus/compute";
import { computeNewRewardTiers, type FocusRewardTier } from "@/lib/focus/rewards";

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

/** Persists the result of reconciling against `now`, if there were changes, and returns the
 * now-up-to-date row along with any reward newly unlocked by that reconciliation. */
export async function reconcileAndPersist(
  row: FocusSessionRow,
  now: Date
): Promise<{ session: FocusSessionRow; unlockedTiers: FocusRewardTier[] }> {
  const { changed, session } = reconcileFocusSession(row, now);
  if (!changed) return { session, unlockedTiers: [] };

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

  const unlockedTiers = session.status === "completed" ? await checkAndUnlockFocusRewards(session.userId) : [];
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
export async function getActiveFocusSessionWithRewards(): Promise<{
  session: FocusSessionRow;
  unlockedTiers: FocusRewardTier[];
} | null> {
  const userId = await getCurrentUserId();
  const [row] = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, userId), inArray(focusSessions.status, LIVE_STATUSES)))
    .limit(1);
  if (!row) return null;
  return reconcileAndPersist(row, new Date());
}

export async function getActiveFocusSession(): Promise<FocusSessionRow | null> {
  const result = await getActiveFocusSessionWithRewards();
  return result?.session ?? null;
}

/**
 * Minimal data any screen needs to display the ongoing focus state — via
 * `FocusHeaderChip` (header) or `MiniFocusIndicator` (floating). Single
 * read point for both instead of repeating the same
 * `Promise.all([getActiveFocusSession(), getFocusSettings()])` in every
 * layout/page that needs it.
 */
export type FocusHeaderData = { session: FocusSessionRow | null; soundEnabled: boolean };

export async function getFocusHeaderData(): Promise<FocusHeaderData> {
  const [session, settings] = await Promise.all([getActiveFocusSession(), getFocusSettings()]);
  return { session, soundEnabled: settings.soundEnabled };
}

export async function getFocusSettings(): Promise<FocusSettingsRow> {
  const userId = await getCurrentUserId();
  const [row] = await db.select().from(focusSettings).where(eq(focusSettings.userId, userId)).limit(1);
  return row ?? { userId, ...DEFAULT_FOCUS_SETTINGS };
}

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
