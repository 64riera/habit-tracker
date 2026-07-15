"use server";

import { getFocusForestData } from "@/lib/queries/focus-forest";

/** Bundled to match the exact query in app/(dashboard)/focus/forest/page.tsx. */
export async function fetchFocusForestAction(today: string) {
  return getFocusForestData(today);
}
