"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { gymSessions } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { notifyDeviceSync } from "@/lib/realtime/notify";
import { extractGymSessionFields, gymSessionFormSchema } from "@/lib/validation/gym";

export type GymSessionFormState = { error?: string };

function revalidateGymPaths() {
  revalidatePath("/");
  revalidatePath("/gym");
  after(() => notifyDeviceSync());
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
    .values({ id, userId, date: values.date, exercises: JSON.stringify(values.exercises) })
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

  await db
    .update(gymSessions)
    .set({ date: values.date, exercises: JSON.stringify(values.exercises) })
    .where(and(eq(gymSessions.id, sessionId), eq(gymSessions.userId, userId)));

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
  await db.delete(gymSessions).where(and(eq(gymSessions.id, sessionId), eq(gymSessions.userId, userId)));
  revalidateGymPaths();
}
