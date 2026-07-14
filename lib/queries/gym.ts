import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gymSessions } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import type { GymExercise } from "@/lib/gym/types";

export type GymSessionRow = Omit<typeof gymSessions.$inferSelect, "exercises"> & { exercises: GymExercise[] };

function parseExercises(raw: string): GymExercise[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Every gym session on the account, most recent first — no date filter,
 * same reasoning as getTransactions(): a personal workout log is small
 * enough to fetch once per page load, and this section is meant to work
 * offline so there's no separate paginated/filtered query to keep in sync.
 */
export async function getGymSessions(): Promise<GymSessionRow[]> {
  const userId = await getCurrentUserId();
  const rows = await db.select().from(gymSessions).where(eq(gymSessions.userId, userId));
  return rows
    .map((r) => ({ ...r, exercises: parseExercises(r.exercises) }))
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}
