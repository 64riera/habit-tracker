import "server-only";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { gymExercises } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { CANONICAL_GYM_EXERCISES } from "@/lib/gym/canonical-exercises";

export type GymExerciseCatalogRow = typeof gymExercises.$inferSelect;

/** The exercise catalog is a fixed set (see lib/gym/canonical-exercises.ts):
 * this self-heals any account that's still missing one — created before
 * that exercise existed, or before the catalog existed at all — instead of
 * requiring a one-off data migration. Same pattern as getCategories()/
 * getFinanceCategories(). */
export async function getGymExercises(): Promise<GymExerciseCatalogRow[]> {
  const userId = await getCurrentUserId();
  let rows = await db
    .select()
    .from(gymExercises)
    .where(eq(gymExercises.userId, userId))
    .orderBy(gymExercises.sortOrder);

  const existingNames = new Set(rows.map((e) => e.nameEs));
  const missing = CANONICAL_GYM_EXERCISES.filter((e) => !existingNames.has(e.nameEs));
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
    rows = await db
      .select()
      .from(gymExercises)
      .where(eq(gymExercises.userId, userId))
      .orderBy(gymExercises.sortOrder);
  }

  return rows;
}
