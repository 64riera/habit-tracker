"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { gymSessions } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { extractGymSessionFields, gymSessionFormSchema } from "@/lib/validation/gym";
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

  // onConflictDoNothing: idempotent if the offline replay retries after a
  // drain gets interrupted between the insert and removing the mutation
  // from the queue (same reasoning as createTransactionCore/createTaskCore).
  await db
    .insert(gymSessions)
    .values({
      id,
      userId,
      date: values.date,
      exercises: JSON.stringify(values.exercises),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoNothing({ target: gymSessions.id });

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
    .set({ date: values.date, exercises: JSON.stringify(values.exercises), updatedAt: new Date().toISOString() })
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
