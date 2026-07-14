"use server";

import { getRoutinesWithStats } from "@/lib/queries/routines";

export async function fetchRoutinesAction(today: string) {
  return getRoutinesWithStats(today);
}
