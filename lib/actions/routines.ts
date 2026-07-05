"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { routines } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { routineSchema, extractRoutineFields } from "@/lib/validation/routine";

export type RoutineFormState = { error?: string };

export async function createRoutine(
  _prevState: RoutineFormState,
  formData: FormData
): Promise<RoutineFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "invalid" };
  const result = await createRoutineCore(id, extractRoutineFields(formData));
  if (result.error) return result;
  redirect("/habitos/rutinas");
}

export async function createRoutineCore(id: string, rawValues: unknown): Promise<RoutineFormState> {
  const parsed = routineSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();
  const count = (await db.select().from(routines).where(eq(routines.userId, userId))).length;

  // onConflictDoNothing: idempotente si el replay offline se reintenta tras un
  // drenado interrumpido entre el insert y el retiro de la mutación de la cola.
  await db
    .insert(routines)
    .values({
      id,
      userId,
      name: values.name,
      habitIds: JSON.stringify(values.habitIds),
      sortOrder: count,
    })
    .onConflictDoNothing({ target: routines.id });

  revalidatePath("/");
  revalidatePath("/habitos/rutinas");
  return {};
}

export async function updateRoutine(
  routineId: string,
  _prevState: RoutineFormState,
  formData: FormData
): Promise<RoutineFormState> {
  const result = await updateRoutineCore(routineId, extractRoutineFields(formData));
  if (result.error) return result;
  redirect("/habitos/rutinas");
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
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)));

  revalidatePath("/");
  revalidatePath("/habitos/rutinas");
  return {};
}

/** Ruta online: escribe vía el core y redirige. El replay offline usa `deleteRoutineCore` directo. */
export async function deleteRoutine(routineId: string): Promise<void> {
  await deleteRoutineCore(routineId);
  redirect("/habitos/rutinas");
}

export async function deleteRoutineCore(routineId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await db.delete(routines).where(and(eq(routines.id, routineId), eq(routines.userId, userId)));

  revalidatePath("/");
  revalidatePath("/habitos/rutinas");
}
