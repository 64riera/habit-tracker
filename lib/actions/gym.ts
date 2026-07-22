"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { gymSessions } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { extractGymSessionFields, gymSessionDraftSchema, gymSessionFormSchema } from "@/lib/validation/gym";
import { ownedWhere } from "@/lib/db/owned-where";

export type GymSessionFormState = { error?: string };

// Not wired to realtime (see lib/realtime/domain.ts) — Gym isn't one of
// the three domains where an instant cross-device push earns its cost;
// it still catches up the normal way on reconnect/focus/manual sync.
function revalidateGymPaths() {
  revalidatePath("/");
  revalidatePath("/gym");
}

export async function createGymSession(
  _prevState: GymSessionFormState,
  formData: FormData
): Promise<GymSessionFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "invalid" };
  const result = await createGymSessionCore(id, extractGymSessionFields(formData));
  if (result.error) return result;
  redirect("/gym");
}

export async function createGymSessionCore(id: string, rawValues: unknown): Promise<GymSessionFormState> {
  const parsed = gymSessionFormSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();

  // onConflictDoUpdate, not onConflictDoNothing: an autosaved draft (see
  // saveGymSessionDraftCore) may already have inserted this id as
  // status "draft" by the time the user hits "Guardar" — this promotes
  // that same row to a real, validated, "completed" session instead of
  // silently leaving it a draft. Still idempotent for the offline-replay
  // retry case (same reasoning as createTransactionCore/createTaskCore):
  // reapplying the same validated values is a no-op either way.
  await db
    .insert(gymSessions)
    .values({
      id,
      userId,
      status: "completed",
      date: values.date,
      exercises: JSON.stringify(values.exercises),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: gymSessions.id,
      set: {
        status: "completed",
        date: values.date,
        exercises: JSON.stringify(values.exercises),
        draftDate: null,
        draftExercises: null,
        draftSavedAt: null,
        updatedAt: new Date().toISOString(),
      },
    });

  revalidateGymPaths();
  return {};
}

export async function updateGymSession(
  sessionId: string,
  _prevState: GymSessionFormState,
  formData: FormData
): Promise<GymSessionFormState> {
  const result = await updateGymSessionCore(sessionId, extractGymSessionFields(formData));
  if (result.error) return result;
  redirect("/gym");
}

export async function updateGymSessionCore(sessionId: string, rawValues: unknown): Promise<GymSessionFormState> {
  const parsed = gymSessionFormSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();

  // Optimistic concurrency: `exercises` is the session's entire set of
  // exercises/sets as one JSON blob, so a blind overwrite here would let
  // editing the same session from two devices silently drop whichever
  // edit lost the race — no merge is possible on a blob. When the form
  // supplied the updatedAt it read, only apply the write if nothing else
  // has touched the row since; otherwise report a conflict instead of
  // clobbering the other edit.
  const conditions = [eq(gymSessions.id, sessionId), eq(gymSessions.userId, userId)];
  if (values.expectedUpdatedAt) conditions.push(eq(gymSessions.updatedAt, values.expectedUpdatedAt));

  const result = await db
    .update(gymSessions)
    .set({
      date: values.date,
      exercises: JSON.stringify(values.exercises),
      // Clears whatever autosaved draft was pending (see
      // saveGymSessionDraftCore) — the user just confirmed a real save, so
      // there's nothing left to protect it from anymore.
      draftDate: null,
      draftExercises: null,
      draftSavedAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(and(...conditions));

  if (values.expectedUpdatedAt && result.rowsAffected === 0) {
    return { error: "conflict" };
  }

  revalidateGymPaths();
  return {};
}

/** Online path: writes via the core and redirects. The offline replay uses `deleteGymSessionCore` directly. */
export async function deleteGymSession(sessionId: string): Promise<void> {
  await deleteGymSessionCore(sessionId);
  redirect("/gym");
}

export async function deleteGymSessionCore(sessionId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await db.delete(gymSessions).where(ownedWhere(gymSessions.id, sessionId, gymSessions.userId, userId));
  revalidateGymPaths();
}

/**
 * Autosave tick from GymSessionForm (see useGymSessionDraftAutosave) — never
 * user-initiated, so validation here is deliberately permissive
 * (gymSessionDraftSchema, not gymSessionFormSchema) and failures are
 * silently swallowed rather than surfaced, same as any other background
 * sync in this app.
 *
 * Which columns get written depends on whether this id already denotes a
 * real, confirmed session:
 *  - no row yet: this is a brand-new session still being built — insert it
 *    as `status: "draft"` directly in date/exercises (nothing "real" to
 *    protect yet).
 *  - row exists with status "draft": same case, later tick — update
 *    date/exercises in place.
 *  - row exists with status "completed": a confirmed session is being
 *    edited — stash the in-progress edit in the sidecar draft_* columns
 *    instead of touching the confirmed date/exercises/updatedAt (see
 *    updateGymSessionCore's optimistic-concurrency comment for why that
 *    column must only change on a real save).
 */
export async function saveGymSessionDraftCore(id: string, rawValues: unknown): Promise<void> {
  const parsed = gymSessionDraftSchema.safeParse(rawValues);
  if (!parsed.success) return;
  const values = parsed.data;
  const userId = await getCurrentUserId();

  const [existing] = await db
    .select({ status: gymSessions.status })
    .from(gymSessions)
    .where(ownedWhere(gymSessions.id, id, gymSessions.userId, userId));

  if (!existing) {
    await db
      .insert(gymSessions)
      .values({
        id,
        userId,
        status: "draft",
        date: values.date,
        exercises: JSON.stringify(values.exercises),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoNothing({ target: gymSessions.id });
    // No revalidateGymPaths() here (unlike the real create/update actions):
    // a draft is invisible to every path that would be revalidated (the
    // list and stats only ever read status "completed" rows, see
    // getGymSessions), and this runs far more often than a real save —
    // busting those caches on every autosave tick would be pure waste.
    return;
  }

  if (existing.status === "draft") {
    await db
      .update(gymSessions)
      .set({ date: values.date, exercises: JSON.stringify(values.exercises), updatedAt: new Date().toISOString() })
      .where(ownedWhere(gymSessions.id, id, gymSessions.userId, userId));
    return;
  }

  await db
    .update(gymSessions)
    .set({
      draftDate: values.date,
      draftExercises: JSON.stringify(values.exercises),
      draftSavedAt: new Date().toISOString(),
    })
    .where(ownedWhere(gymSessions.id, id, gymSessions.userId, userId));
}

/**
 * Discards whatever pending draft exists for `id` — either a brand-new
 * session that was never confirmed (deleted outright, same as
 * deleteGymSessionCore: it was never a real session) or a pending edit to
 * an already-confirmed one (just clears the sidecar draft_* columns,
 * leaving the confirmed session untouched).
 */
export async function discardGymSessionDraftCore(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const [existing] = await db
    .select({ status: gymSessions.status })
    .from(gymSessions)
    .where(ownedWhere(gymSessions.id, id, gymSessions.userId, userId));
  if (!existing) return;

  if (existing.status === "draft") {
    await deleteGymSessionCore(id);
    return;
  }

  // No revalidateGymPaths() here: clearing a sidecar draft doesn't change
  // the confirmed date/exercises the list/stats already show for this
  // session (see getGymSessions).
  await db
    .update(gymSessions)
    .set({ draftDate: null, draftExercises: null, draftSavedAt: null })
    .where(ownedWhere(gymSessions.id, id, gymSessions.userId, userId));
}
