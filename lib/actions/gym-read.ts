"use server";

import { getGymSessions, getGymSessionDraft } from "@/lib/queries/gym";

/** Thin read-only wrapper (server-only, can't be imported into a Client
 * Component) so it's callable as an SWR fetcher. Kept separate from
 * lib/actions/gym.ts (the write actions, which call revalidatePath and are
 * wired into replay-registry.ts) — reads and writes are different
 * responsibilities and don't share a call-site contract. */
export async function fetchGymSessionsAction() {
  return getGymSessions();
}

export async function fetchGymSessionDraftAction() {
  return getGymSessionDraft();
}
