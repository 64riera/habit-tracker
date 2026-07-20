"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { gymRoutines } from "@/lib/db/schema";
import { nextSortOrder } from "@/lib/db/sort-order";
import { ownedWhere } from "@/lib/db/owned-where";
import { getCurrentUserId } from "@/lib/auth/session";
import { getGymExercises } from "@/lib/queries/gym-exercises";
import { CANONICAL_GYM_ROUTINES } from "@/lib/gym/canonical-routines";
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
  const sortOrder = await nextSortOrder(gymRoutines, gymRoutines.sortOrder, gymRoutines.userId, userId);

  await db
    .insert(gymRoutines)
    .values({
      id: nanoid(),
      userId,
      name: trimmedName,
      exercises: JSON.stringify(cleanExercises),
      sortOrder,
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
    .where(ownedWhere(gymRoutines.id, routineId, gymRoutines.userId, userId));

  revalidateGymRoutinePaths();
  return {};
}

export async function setGymRoutineHidden(routineId: string, hidden: boolean): Promise<void> {
  const userId = await getCurrentUserId();
  await db
    .update(gymRoutines)
    .set({ hidden })
    .where(ownedWhere(gymRoutines.id, routineId, gymRoutines.userId, userId));

  revalidateGymRoutinePaths();
}

/** Overwrites a routine's exercise list with the current
 * lib/gym/canonical-routines.ts definition for its name — the counterpart
 * to how getGymRoutines() only *seeds missing* routines: once a "Upper A"
 * row already exists on an account, updating the canonical list alone
 * never touches it again (onConflictDoNothing on insert). This is the
 * explicit, user-triggered way to pull in a canonical update after the
 * fact, for the exact same reason it's not automatic — it would silently
 * discard any of the user's own edits to that routine. Only applies to
 * routines whose name still matches a canonical entry. */
export async function resetGymRoutineToCanonical(routineId: string): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();
  const [routine] = await db
    .select({ name: gymRoutines.name })
    .from(gymRoutines)
    .where(ownedWhere(gymRoutines.id, routineId, gymRoutines.userId, userId));
  if (!routine) return { error: "notFound" };

  const canonical = CANONICAL_GYM_ROUTINES.find((r) => r.name === routine.name);
  if (!canonical) return { error: "notCanonical" };

  const catalog = await getGymExercises(true);
  const idByName = new Map(catalog.map((e) => [e.nameEs, e.id]));
  const exercises: RoutineExercise[] = canonical.exercises.flatMap((e) => {
    const exerciseId = idByName.get(e.nameEs);
    return exerciseId ? [{ exerciseId, note: e.note }] : [];
  });
  if (exercises.length === 0) return { error: "exercises" };

  await db
    .update(gymRoutines)
    .set({ exercises: JSON.stringify(exercises) })
    .where(ownedWhere(gymRoutines.id, routineId, gymRoutines.userId, userId));

  revalidateGymRoutinePaths();
  return {};
}
