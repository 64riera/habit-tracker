"use client";

import { useMemo } from "react";
import { useOffline } from "@/lib/offline/client";
import {
  pendingTransactionCreates,
  pendingTransactionUpdates,
  pendingTransactionDeleteIds,
  buildGhostTransaction,
  applyPendingTransactionEdit,
} from "@/lib/offline/pending-selectors";
import { swrKeys } from "@/lib/swr/keys";
import { usePageData } from "@/lib/swr/use-page-data";
import {
  fetchFinanceBudgetsAction,
  fetchFinanceCategoriesAction,
  fetchTransactionsAction,
} from "@/lib/actions/finance-read";
import type { FinanceBudgetRow, FinanceCategoryRow, TransactionWithCategory } from "@/lib/queries/finance";

/** Fetches finance data via SWR and overlays any offline-queued create/edit/delete
 * mutations on top of it — the "what should actually render right now" list, kept
 * separate from the period aggregation math (see useFinancePeriodStats) and from
 * presentation (FinanceClient). */
export function useFinanceTransactions(
  today: string,
  initial: { transactions: TransactionWithCategory[]; categories: FinanceCategoryRow[]; budgets: FinanceBudgetRow[] }
) {
  const { data: transactions } = usePageData(swrKeys.financeTransactions(), fetchTransactionsAction, initial.transactions);
  const { data: categories } = usePageData(swrKeys.financeCategories(), fetchFinanceCategoriesAction, initial.categories);
  const { data: budgets } = usePageData(swrKeys.financeBudgets(), fetchFinanceBudgetsAction, initial.budgets);
  const { pendingMutations } = useOffline();

  const pendingNew = pendingTransactionCreates(pendingMutations);
  const pendingEdits = pendingTransactionUpdates(pendingMutations);
  const pendingDeleteIds = pendingTransactionDeleteIds(pendingMutations);
  const pendingIds = useMemo(
    () => new Set([...pendingNew.map((m) => m.id), ...pendingEdits.keys()]),
    [pendingNew, pendingEdits]
  );

  const allTransactions = useMemo(() => {
    const overlaid = transactions
      .filter((tx) => !pendingDeleteIds.has(tx.id))
      .map((tx) => (pendingEdits.has(tx.id) ? applyPendingTransactionEdit(tx, pendingEdits.get(tx.id)!, categories) : tx));
    const ghosts = pendingNew.map((m) => buildGhostTransaction(m.id, m.values, categories));
    // Same tie-break as the server (lib/queries/finance.ts): date desc,
    // then createdAt desc. Without the second key, same-day transactions
    // fall back to whatever order they happened to arrive in this array —
    // an offline-created transaction (appended as a ghost, always last)
    // would render after every synced same-day transaction regardless of
    // when it was actually entered, instead of matching the order the
    // server settles on once it syncs.
    return [...overlaid, ...ghosts].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
    );
  }, [transactions, pendingEdits, pendingDeleteIds, pendingNew, categories]);

  return { transactions: allTransactions, categories, budgets, pendingIds };
}
