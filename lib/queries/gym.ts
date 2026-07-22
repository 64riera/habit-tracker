import "server-only";
import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gymSessions } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import type { GymExercise } from "@/lib/gym/types";

export type GymSessionRow = Omit<typeof gymSessions.$inferSelect, "exercises" | "draftExercises"> & {
  exercises: GymExercise[];
  draftExercises: GymExercise[] | null;
};

function parseExercises(raw: string): GymExercise[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toRow(r: typeof gymSessions.$inferSelect): GymSessionRow {
  return {
    ...r,
    exercises: parseExercises(r.exercises),
    draftExercises: r.draftExercises ? parseExercises(r.draftExercises) : null,
  };
}

/**
 * Every confirmed gym session on the account, most recent first — no date
 * filter, same reasoning as getTransactions(): a personal workout log is
 * small enough to fetch once per page load, and this section is meant to
 * work offline so there's no separate paginated/filtered query to keep in
 * sync. Excludes `status: "draft"` rows (a session still being built, never
 * confirmed with "Guardar" — see saveGymSessionDraftCore): those aren't
 * real sessions yet and would corrupt the list/stats if counted as one.
 */
export const getGymSessions = cache(async (): Promise<GymSessionRow[]> => {
  const userId = await getCurrentUserId();
  const rows = await db
    .select()
    .from(gymSessions)
    .where(and(eq(gymSessions.userId, userId), eq(gymSessions.status, "completed")));
  return rows
    .map(toRow)
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
});

/**
 * The current in-progress "new session" draft, if any (see
 * saveGymSessionDraftCore) — at most one is expected per user, since
 * starting a new session is a singular state ("the session I'm doing right
 * now"). Lets /gym/new offer to resume it instead of starting blank.
 */
export const getGymSessionDraft = cache(async (): Promise<GymSessionRow | undefined> => {
  const userId = await getCurrentUserId();
  const [row] = await db
    .select()
    .from(gymSessions)
    .where(and(eq(gymSessions.userId, userId), eq(gymSessions.status, "draft")))
    .orderBy(desc(gymSessions.updatedAt))
    .limit(1);
  return row ? toRow(row) : undefined;
});
