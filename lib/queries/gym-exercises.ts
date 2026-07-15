import "server-only";
import { cache } from "react";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { gymExercises } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { CANONICAL_GYM_EXERCISES } from "@/lib/gym/canonical-exercises";

export type GymExerciseCatalogRow = typeof gymExercises.$inferSelect;

/** The exercise catalog starts from a fixed set (see
 * lib/gym/canonical-exercises.ts) but, unlike habit/finance categories, can
 * also be extended by the user (see lib/actions/gym-exercises.ts). This
 * self-heals any account still missing a canonical exercise — created
 * before that exercise existed, or before the catalog existed at all —
 * instead of requiring a one-off data migration, and additionally hides any
 * previously-seeded (`isCustom: false`) row that's no longer in the current
 * canonical list (e.g. after trimming/replacing it), so it stops cluttering
 * the picker without deleting it — a past session may still reference it,
 * and hiding (not deleting) keeps that display intact. Rows the user
 * created or renamed themselves (`isCustom: true`) are never touched by
 * this cleanup.
 *
 * Memoized with `cache()`: the write it does (insert/hide) only needs to
 * run once per request even if both the session form and history view ask
 * for the catalog. `includeHidden` mirrors getCategories()'s convention —
 * false for pickers (only exercises the user actively uses), true for the
 * management page and for looking up names of exercises past sessions
 * reference, even if since hidden. */
export const getGymExercises = cache(async (includeHidden = false): Promise<GymExerciseCatalogRow[]> => {
  const userId = await getCurrentUserId();
  let rows = await db
    .select()
    .from(gymExercises)
    .where(eq(gymExercises.userId, userId))
    .orderBy(gymExercises.sortOrder);

  const existingNames = new Set(rows.map((e) => e.nameEs));
  const missing = CANONICAL_GYM_EXERCISES.filter((e) => !existingNames.has(e.nameEs));

  const canonicalNames = new Set(CANONICAL_GYM_EXERCISES.map((e) => e.nameEs));
  const orphanedIds = rows
    .filter((e) => !e.isCustom && !e.hidden && !canonicalNames.has(e.nameEs))
    .map((e) => e.id);

  if (missing.length > 0) {
    const maxSortOrder = rows.reduce((max, e) => Math.max(max, e.sortOrder), -1);
    await db
      .insert(gymExercises)
      .values(
        missing.map((e, i) => ({
          id: nanoid(),
          userId,
          nameEs: e.nameEs,
          nameEn: e.nameEn,
          muscleGroup: e.muscleGroup,
          sortOrder: maxSortOrder + 1 + i,
        }))
      )
      .onConflictDoNothing({ target: [gymExercises.userId, gymExercises.nameEs] });
  }
  if (orphanedIds.length > 0) {
    await db.update(gymExercises).set({ hidden: true }).where(inArray(gymExercises.id, orphanedIds));
  }
  if (missing.length > 0 || orphanedIds.length > 0) {
    rows = await db
      .select()
      .from(gymExercises)
      .where(eq(gymExercises.userId, userId))
      .orderBy(gymExercises.sortOrder);
  }

  return includeHidden ? rows : rows.filter((e) => !e.hidden);
});
