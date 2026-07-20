"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { routines } from "@/lib/db/schema";
import { nextSortOrder } from "@/lib/db/sort-order";
import { ownedWhere } from "@/lib/db/owned-where";
import { getCurrentUserId } from "@/lib/auth/session";
import { routineSchema, extractRoutineFields } from "@/lib/validation/routine";

export type RoutineFormState = { error?: string };

// Not wired to realtime (see lib/realtime/domain.ts) — Routines isn't one
// of the three domains where an instant cross-device push earns its cost;
// it still catches up the normal way on reconnect/focus/manual sync.
function revalidateRoutinesPaths() {
  revalidatePath("/");
  revalidatePath("/habits/routines");
}

export async function createRoutine(
  _prevState: RoutineFormState,
  formData: FormData
): Promise<RoutineFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "invalid" };
  const result = await createRoutineCore(id, extractRoutineFields(formData));
  if (result.error) return result;
  redirect("/habits/routines");
}

export async function createRoutineCore(id: string, rawValues: unknown): Promise<RoutineFormState> {
  const parsed = routineSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();
  const sortOrder = await nextSortOrder(routines, routines.sortOrder, routines.userId, userId);

  // onConflictDoNothing: idempotent if the offline replay retries after a
  // drain gets interrupted between the insert and removing the mutation from the queue.
  await db
    .insert(routines)
    .values({
      id,
      userId,
      name: values.name,
      habitIds: JSON.stringify(values.habitIds),
      sortOrder,
    })
    .onConflictDoNothing({ target: routines.id });

  revalidateRoutinesPaths();
  return {};
}

export async function updateRoutine(
  routineId: string,
  _prevState: RoutineFormState,
  formData: FormData
): Promise<RoutineFormState> {
  const result = await updateRoutineCore(routineId, extractRoutineFields(formData));
  if (result.error) return result;
  redirect("/habits/routines");
}

export async function updateRoutineCore(
  routineId: string,
  rawValues: unknown
): Promise<RoutineFormState> {
  const parsed = routineSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();

  await db
    .update(routines)
    .set({ name: values.name, habitIds: JSON.stringify(values.habitIds) })
    .where(ownedWhere(routines.id, routineId, routines.userId, userId));

  revalidateRoutinesPaths();
  return {};
}

/** Online path: writes via the core and redirects. The offline replay uses `deleteRoutineCore` directly. */
export async function deleteRoutine(routineId: string): Promise<void> {
  await deleteRoutineCore(routineId);
  redirect("/habits/routines");
}

export async function deleteRoutineCore(routineId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await db.delete(routines).where(ownedWhere(routines.id, routineId, routines.userId, userId));

  revalidateRoutinesPaths();
}
