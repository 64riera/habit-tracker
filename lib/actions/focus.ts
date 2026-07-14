"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db/client";
import { categories, focusSessions, focusSettings, habits } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { notifyDeviceSync } from "@/lib/realtime/notify";
import { getServerToday } from "@/lib/settings/date-server";
import { checkAndUnlockFocusRewards, getActiveFocusSession, getActiveFocusSessionWithRewards } from "@/lib/queries/focus";
import {
  applyEndBreakEarly,
  applyFinalize,
  applyPause,
  applyResume,
  resolveStartFocusValues,
  LIVE_STATUSES,
  type FocusSessionPatch,
  type FocusSessionRow,
  type FocusSessionStatus,
} from "@/lib/focus/compute";
import type { FocusRewardTier } from "@/lib/focus/rewards";
import {
  extractStartFocusSessionFields,
  focusSettingsSchema,
  startFocusSessionSchema,
  type StartFocusSessionValues,
} from "@/lib/validation/focus";

/** Invalidates the whole (dashboard) layout, not just "/focus" — the
 * floating active-session indicator lives in the shared layout, so a focus
 * mutation made while on /focus must also be reflected on any other route
 * the user navigates to afterward. */
function revalidateFocusPaths() {
  revalidatePath("/", "layout");
  after(() => notifyDeviceSync());
}

async function resolveHabit(userId: string, habitId: string | undefined | null) {
  if (!habitId) return null;
  const [habit] = await db
    .select({ id: habits.id, categoryId: habits.categoryId })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1);
  return habit ?? null;
}

async function resolveCategoryId(userId: string, categoryId: string | undefined | null): Promise<string | null> {
  if (!categoryId) return null;
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);
  return category?.id ?? null;
}

/** The category of a session linked to a habit is always the habit's own
 * category (not whatever the client sends, which the form doesn't even
 * let the user edit in that case) — if there's no habit, the directly
 * chosen category is used. */
async function resolveFocusAttribution(
  userId: string,
  habitId: string | undefined | null,
  categoryId: string | undefined | null
): Promise<{ habitId: string | null; categoryId: string | null }> {
  const habit = await resolveHabit(userId, habitId);
  if (habit) return { habitId: habit.id, categoryId: habit.categoryId };
  return { habitId: null, categoryId: await resolveCategoryId(userId, categoryId) };
}

/**
 * Core reused by the online form path (`startFocusSessionOnline`) and by
 * the offline replay log — takes a client-generated `id` (same pattern as
 * `createHabitCore`) instead of generating one itself, so a session
 * started offline keeps the same id its "ghost" preview already used.
 */
export async function startFocusSessionCore(id: string, input: StartFocusSessionValues): Promise<FocusSessionRow> {
  const values = startFocusSessionSchema.parse(input);
  const userId = await getCurrentUserId();

  // Reconcile first: if the "active" session already expired due to the
  // cap or an elapsed break, it shouldn't block starting a new one.
  const existing = await getActiveFocusSession();
  if (existing && LIVE_STATUSES.includes(existing.status)) return existing;

  const now = new Date();
  const nowIso = now.toISOString();
  const today = await getServerToday(now);
  const { habitId, categoryId } = await resolveFocusAttribution(userId, values.habitId, values.categoryId);
  const resolved = resolveStartFocusValues(values);
  // Settings remembers the duration the user actually chose, not the
  // resolved default when they left it blank in stopwatch mode.
  const durationMinutes = values.mode === "countdown" ? values.durationMinutes ?? 25 : 25;

  await db.batch([
    // onConflictDoNothing: an interrupted offline replay retry shouldn't
    // fail on an id collision (see createHabitCore for the same reasoning).
    db
      .insert(focusSessions)
      .values({
        id,
        userId,
        habitId,
        categoryId,
        mode: resolved.mode,
        plannedDurationSeconds: resolved.plannedDurationSeconds,
        status: "running",
        startedAt: nowIso,
        lastResumedAt: nowIso,
        accumulatedActiveSeconds: 0,
        breaksEnabled: resolved.breaksEnabled,
        breakIntervalMinutes: resolved.breaksEnabled ? resolved.breakIntervalMinutes : null,
        breakDurationMinutes: resolved.breaksEnabled ? resolved.breakDurationMinutes : null,
        date: today,
      })
      .onConflictDoNothing(),
    // What was just chosen is remembered as the default for next time —
    // unlike the session row above, this keeps a numeric interval/duration
    // even when breaks are off, so re-enabling them later starts sensible.
    db
      .insert(focusSettings)
      .values({
        userId,
        defaultMode: resolved.mode,
        defaultDurationMinutes: durationMinutes,
        breaksEnabled: resolved.breaksEnabled,
        breakIntervalMinutes: resolved.breakIntervalMinutes,
        breakDurationMinutes: resolved.breakDurationMinutes,
      })
      .onConflictDoUpdate({
        target: focusSettings.userId,
        set: {
          defaultMode: resolved.mode,
          defaultDurationMinutes: durationMinutes,
          breaksEnabled: resolved.breaksEnabled,
          breakIntervalMinutes: resolved.breakIntervalMinutes,
          breakDurationMinutes: resolved.breakDurationMinutes,
        },
      }),
  ]);

  revalidateFocusPaths();
  const [created] = await db.select().from(focusSessions).where(eq(focusSessions.id, id)).limit(1);
  return created;
}

/** Saves the daily focus goal (in minutes) as the user's remembered preference. */
export async function setFocusDailyGoal(minutes: number): Promise<void> {
  const { dailyGoalMinutes } = focusSettingsSchema.parse({ dailyGoalMinutes: minutes });
  const userId = await getCurrentUserId();
  await db
    .insert(focusSettings)
    .values({ userId, dailyGoalMinutes })
    .onConflictDoUpdate({ target: focusSettings.userId, set: { dailyGoalMinutes } });
  revalidateFocusPaths();
}

/** Enables/disables the sound + title flash when a session finishes or an active break starts. */
export async function setFocusSoundEnabled(enabled: boolean): Promise<void> {
  const userId = await getCurrentUserId();
  await db
    .insert(focusSettings)
    .values({ userId, soundEnabled: enabled })
    .onConflictDoUpdate({ target: focusSettings.userId, set: { soundEnabled: enabled } });
  revalidateFocusPaths();
}

export type StartFocusSessionFormState = { error?: string };

/**
 * Online path for `useOfflineFormAction` (see `focus-start-form.tsx`):
 * reads the client-generated id from the form and delegates to the core.
 * Doesn't redirect — starting a session keeps you on /focus.
 */
export async function startFocusSessionOnline(
  _prevState: StartFocusSessionFormState,
  formData: FormData
): Promise<StartFocusSessionFormState> {
  const id = String(formData.get("id") ?? "");
  const parsed = startFocusSessionSchema.safeParse(extractStartFocusSessionFields(formData));
  if (!id || !parsed.success) return { error: "invalid" };
  await startFocusSessionCore(id, parsed.data);
  return {};
}

export type ActiveFocusSessionResult = { session: FocusSessionRow | null; unlockedTiers: FocusRewardTier[] };

/**
 * Read-only RPC for the client's ticking hook: rereads the active session
 * (already reconciled) without forcing a route invalidation — unlike the
 * transitions below, this is called frequently (every time the tab regains
 * focus, or when the client detects a threshold must have already been
 * crossed) and shouldn't refresh the whole Server Components tree on every
 * call. It includes `unlockedTiers` because a resync can also be the
 * moment reconciliation completes the session (e.g. the user watches the
 * countdown reach zero) — the ticking hook uses this to fire the reward
 * toast even when the user never tapped "Finish".
 */
export async function getActiveFocusSessionAction(): Promise<ActiveFocusSessionResult> {
  const result = await getActiveFocusSessionWithRewards();
  return result ?? { session: null, unlockedTiers: [] };
}

/**
 * Reconciles the active session against `now` and, if it's still in the
 * expected state afterward, applies the requested transition. If
 * reconciliation already closed it (cap reached while the user wasn't
 * looking), it simply returns the already-final state instead of applying
 * the change — same code path for the "live" case and the "reconciled
 * after a long absence" case.
 */
async function transition(
  allowedStatuses: FocusSessionStatus[],
  makePatch: (session: FocusSessionRow, now: Date) => FocusSessionPatch
): Promise<ActiveFocusSessionResult> {
  const session = await getActiveFocusSession();
  if (!session || !allowedStatuses.includes(session.status)) return { session, unlockedTiers: [] };

  const now = new Date();
  const patch = makePatch(session, now);
  await db.update(focusSessions).set(patch).where(eq(focusSessions.id, session.id));
  revalidateFocusPaths();

  const unlockedTiers = patch.status === "completed" ? await checkAndUnlockFocusRewards(session.userId) : [];
  return { session: { ...session, ...patch }, unlockedTiers };
}

export async function pauseFocusSession(): Promise<void> {
  await transition(["running"], (session, now) => applyPause(session, now));
}

export async function resumeFocusSession(): Promise<void> {
  await transition(["paused"], (_session, now) => applyResume(now));
}

export async function endBreakEarly(): Promise<void> {
  await transition(["on_break"], (_session, now) => applyEndBreakEarly(now));
}

/** Unlike the other transitions, this one does return something (the
 * newly unlocked tiers): the "Finish" button uses it via `useTransition`,
 * not as a plain `<form action>`, precisely so it can fire the toast. */
export async function finishFocusSession(): Promise<{ unlockedTiers: FocusRewardTier[] }> {
  const { unlockedTiers } = await transition(["running", "on_break", "paused"], (session, now) =>
    applyFinalize(session, now, "completed")
  );
  return { unlockedTiers };
}

export async function cancelFocusSession(): Promise<void> {
  await transition(["running", "on_break", "paused"], (session, now) => applyFinalize(session, now, "cancelled"));
}
