"use server";

import { getTasksWithStatus } from "@/lib/queries/tasks";

/** Thin read-only wrapper so this is callable as an SWR fetcher — see
 * lib/actions/finance-read.ts for the pattern this follows. */
export async function fetchTasksAction(today: string) {
  return getTasksWithStatus(today);
}
