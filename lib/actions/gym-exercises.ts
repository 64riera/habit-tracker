"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { gymExercises } from "@/lib/db/schema";
import { nextSortOrder } from "@/lib/db/sort-order";
import { getCurrentUserId } from "@/lib/auth/session";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/gym/canonical-exercises";

function isMuscleGroup(value: string): value is MuscleGroup {
  return (MUSCLE_GROUPS as readonly string[]).includes(value);
}

// Not wired to realtime (see lib/realtime/domain.ts) — same call as
// categories in lib/actions/categories.ts: managing the catalog isn't
// frequent enough to earn an instant cross-device push, it catches up the
// normal way on reconnect/focus/manual sync.
function revalidateGymExercisePaths() {
  revalidatePath("/gym");
  revalidatePath("/gym/exercises");
  revalidatePath("/gym/new");
}

/** Adds a user-defined exercise to the catalog. Stored under both name
 * columns (the schema is bilingual for the canonical catalog, but asking a
 * personal exercise log for a translation of an exercise you typed once
 * yourself is friction with no payoff) so display code that reads
 * nameEs/nameEn for any other exercise keeps working unchanged. */
export async function createGymExercise(name: string, muscleGroup: string): Promise<{ error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "name" };
  if (!isMuscleGroup(muscleGroup)) return { error: "muscleGroup" };

  const userId = await getCurrentUserId();
  const sortOrder = await nextSortOrder(gymExercises, gymExercises.sortOrder, gymExercises.userId, userId);

  await db
    .insert(gymExercises)
    .values({
      id: nanoid(),
      userId,
      nameEs: trimmed,
      nameEn: trimmed,
      muscleGroup,
      sortOrder,
      isCustom: true,
    })
    .onConflictDoNothing({ target: [gymExercises.userId, gymExercises.nameEs] });

  revalidateGymExercisePaths();
  return {};
}

/** Renames and/or reassigns the muscle group of any exercise (canonical or
 * custom). Marks it `isCustom` from then on: once a user has edited a
 * canonical exercise's name, it's no longer the canonical entry that name
 * used to represent, so a future catalog swap must not treat it as an
 * orphaned auto-seeded row and hide it (see getGymExercises()). */
export async function updateGymExercise(
  exerciseId: string,
  name: string,
  muscleGroup: string
): Promise<{ error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "name" };
  if (!isMuscleGroup(muscleGroup)) return { error: "muscleGroup" };

  const userId = await getCurrentUserId();
  await db
    .update(gymExercises)
    .set({ nameEs: trimmed, nameEn: trimmed, muscleGroup, isCustom: true })
    .where(and(eq(gymExercises.id, exerciseId), eq(gymExercises.userId, userId)));

  revalidateGymExercisePaths();
  return {};
}

/** Hides/shows an exercise — the only "removal" offered, same reasoning as
 * setCategoryHidden: a past session may still reference this exercise by
 * id, so a hard delete would leave that session unable to show its name. */
export async function setGymExerciseHidden(exerciseId: string, hidden: boolean): Promise<void> {
  const userId = await getCurrentUserId();
  await db
    .update(gymExercises)
    .set({ hidden })
    .where(and(eq(gymExercises.id, exerciseId), eq(gymExercises.userId, userId)));

  revalidateGymExercisePaths();
}
