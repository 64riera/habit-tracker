"use server";

import { getFinanceCategories, getTransactions } from "@/lib/queries/finance";

/** Thin read-only wrappers around lib/queries/finance.ts (server-only, can't
 * be imported into a Client Component) so they're callable as SWR fetchers.
 * Kept separate from lib/actions/finance.ts (the write actions, which call
 * revalidatePath and are wired into replay-registry.ts) — reads and writes
 * are different responsibilities and don't share a call-site contract. */

export async function fetchFinanceCategoriesAction() {
  return getFinanceCategories();
}

export async function fetchTransactionsAction() {
  const categories = await getFinanceCategories();
  return getTransactions(categories);
}
