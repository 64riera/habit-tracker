"use server";

import { getHabitsForToday } from "@/lib/queries/habits";
import { getRoutinesForToday } from "@/lib/queries/routines";

/** Bundled because they're always fetched together for a given date (see
 * app/(dashboard)/today-habits.tsx) and always invalidated together (any
 * habit log/routine action affects both the habit rows and their routine
 * completion counts). Categories are fetched separately (fetchCategoriesAction
 * in lib/actions/habits-read.ts) since that data is shared, unkeyed by date,
 * with /habits and other routes. */
export async function fetchTodayAction(date: string) {
  const [habits, routines] = await Promise.all([getHabitsForToday(date), getRoutinesForToday(date)]);
  return { habits, routines };
}
