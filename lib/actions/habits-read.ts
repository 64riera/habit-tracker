"use server";

import { getAllHabitsForManagement, getCategories, getHabitNames } from "@/lib/queries/habits";
import { getFocusHeaderData } from "@/lib/queries/focus";

/** Thin read-only wrappers, one per piece of shared habit-domain data reused
 * across several routes (habits, routines, history, stats, focus) — kept as
 * individually keyed SWR fetchers (see lib/swr/keys.ts) so a category list
 * fetched once for /habits is reused instantly when /history mounts, instead
 * of every route re-fetching its own copy. */

export async function fetchHabitsListAction(today: string) {
  return getAllHabitsForManagement(today);
}

export async function fetchCategoriesAction() {
  return getCategories();
}

export async function fetchHabitNamesAction() {
  return getHabitNames();
}

export async function fetchFocusHeaderAction() {
  return getFocusHeaderData();
}
