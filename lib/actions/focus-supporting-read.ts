"use server";

import { getFocusSettings, getTodayFocusProgress } from "@/lib/queries/focus";
import { getCategories, getHabitNames } from "@/lib/queries/habits";

/** Everything on /focus except the active session itself, which stays
 * server-rendered per visit (see app/(dashboard)/focus/page.tsx) rather than
 * SWR-cached: it's live, second-by-second state with its own independent
 * polling (useLiveFocusState), a poor fit for a read cache. `null` is passed
 * for the session here deliberately — this bundle is only rendered in the
 * non-live branch, where an active session (if any) never contributes
 * "live" seconds to the progress total anyway (see getTodayFocusProgress). */
export async function fetchFocusSupportingAction(today: string) {
  const [settings, habitOptions, categories, progress] = await Promise.all([
    getFocusSettings(),
    getHabitNames(),
    getCategories(),
    getTodayFocusProgress(today, null),
  ]);
  return { settings, habitOptions, categories, progress };
}
