"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { gymRoutines } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import type { RoutineExercise } from "@/lib/gym/types";

function revalidateGymRoutinePaths() {
  revalidatePath("/gym");
  revalidatePath("/gym/routines");
  revalidatePath("/gym/new");
}

function sanitizeExercises(exercises: RoutineExercise[]): RoutineExercise[] {
  return exercises
    .filter((e) => typeof e.exerciseId === "string" && e.exerciseId.trim().length > 0)
    .map((e) => ({ exerciseId: e.exerciseId, note: e.note?.trim() || undefined }));
}

/** Creates a user-defined routine — same "no hard delete, hide instead"
 * reasoning as gym exercises doesn't apply here in reverse: a routine is
 * just a template, nothing else references it, so update/hide is enough
 * without needing to protect historical data. */
export async function createGymRoutine(name: string, exercises: RoutineExercise[]): Promise<{ error?: string }> {
  const trimmedName = name.trim();
  const cleanExercises = sanitizeExercises(exercises);
  if (!trimmedName) return { error: "name" };
  if (cleanExercises.length === 0) return { error: "exercises" };

  const userId = await getCurrentUserId();
  const rows = await db.select({ sortOrder: gymRoutines.sortOrder }).from(gymRoutines).where(eq(gymRoutines.userId, userId));
  const maxSortOrder = rows.reduce((max, r) => Math.max(max, r.sortOrder), -1);

  await db
    .insert(gymRoutines)
    .values({
      id: nanoid(),
      userId,
      name: trimmedName,
      exercises: JSON.stringify(cleanExercises),
      sortOrder: maxSortOrder + 1,
    })
    .onConflictDoNothing({ target: [gymRoutines.userId, gymRoutines.name] });

  revalidateGymRoutinePaths();
  return {};
}

export async function updateGymRoutine(
  routineId: string,
  name: string,
  exercises: RoutineExercise[]
): Promise<{ error?: string }> {
  const trimmedName = name.trim();
  const cleanExercises = sanitizeExercises(exercises);
  if (!trimmedName) return { error: "name" };
  if (cleanExercises.length === 0) return { error: "exercises" };

  const userId = await getCurrentUserId();
  await db
    .update(gymRoutines)
    .set({ name: trimmedName, exercises: JSON.stringify(cleanExercises) })
    .where(and(eq(gymRoutines.id, routineId), eq(gymRoutines.userId, userId)));

  revalidateGymRoutinePaths();
  return {};
}

export async function setGymRoutineHidden(routineId: string, hidden: boolean): Promise<void> {
  const userId = await getCurrentUserId();
  await db
    .update(gymRoutines)
    .set({ hidden })
    .where(and(eq(gymRoutines.id, routineId), eq(gymRoutines.userId, userId)));

  revalidateGymRoutinePaths();
}
