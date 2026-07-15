import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { gymRoutines } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { getGymExercises } from "@/lib/queries/gym-exercises";
import { CANONICAL_GYM_ROUTINES } from "@/lib/gym/canonical-routines";
import type { RoutineExercise } from "@/lib/gym/types";

export type GymRoutineRow = Omit<typeof gymRoutines.$inferSelect, "exercises"> & { exercises: RoutineExercise[] };

function parseExercises(json: string): RoutineExercise[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as RoutineExercise[]) : [];
  } catch {
    return [];
  }
}

/** Same self-healing pattern as getGymExercises(), one level up: seeds the
 * canonical routines (lib/gym/canonical-routines.ts) the first time an
 * account has none, resolving each entry's exercise name to *this* user's
 * own gymExercises row id (a routine can't reference a fixed canonical id —
 * every account has its own row ids). If a canonical exercise is somehow
 * missing (renamed away before this ever ran, say), that one entry is
 * dropped rather than failing the whole routine; a routine only skipped
 * entirely if every entry fails to resolve. Memoized with `cache()`, same
 * reasoning as getGymExercises(). `includeHidden` follows the same
 * convention: false for the "start from routine" picker, true for the
 * management page. */
export const getGymRoutines = cache(async (includeHidden = false): Promise<GymRoutineRow[]> => {
  const userId = await getCurrentUserId();
  let rows = await db
    .select()
    .from(gymRoutines)
    .where(eq(gymRoutines.userId, userId))
    .orderBy(gymRoutines.sortOrder);

  const existingNames = new Set(rows.map((r) => r.name));
  const missing = CANONICAL_GYM_ROUTINES.filter((r) => !existingNames.has(r.name));

  if (missing.length > 0) {
    const catalog = await getGymExercises(true);
    const idByName = new Map(catalog.map((e) => [e.nameEs, e.id]));
    const maxSortOrder = rows.reduce((max, r) => Math.max(max, r.sortOrder), -1);

    const toInsert = missing
      .map((routine, i) => {
        const exercises: RoutineExercise[] = routine.exercises.flatMap((e) => {
          const exerciseId = idByName.get(e.nameEs);
          return exerciseId ? [{ exerciseId, note: e.note }] : [];
        });
        if (exercises.length === 0) return null;
        return {
          id: nanoid(),
          userId,
          name: routine.name,
          exercises: JSON.stringify(exercises),
          sortOrder: maxSortOrder + 1 + i,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (toInsert.length > 0) {
      await db.insert(gymRoutines).values(toInsert).onConflictDoNothing({
        target: [gymRoutines.userId, gymRoutines.name],
      });
      rows = await db
        .select()
        .from(gymRoutines)
        .where(eq(gymRoutines.userId, userId))
        .orderBy(gymRoutines.sortOrder);
    }
  }

  const parsed = rows.map((r) => ({ ...r, exercises: parseExercises(r.exercises) }));
  return includeHidden ? parsed : parsed.filter((r) => !r.hidden);
});
