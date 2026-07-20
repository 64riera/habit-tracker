"use client";

import { useMemo } from "react";
import { daysBetween, endOfMonth, groupByDate, startOfMonth } from "@/lib/date";
import {
  periodRange,
  previousPeriodRange,
  filterByRange,
  summarizeTransactions,
  bucketTransactions,
  bucketForPeriod,
  dailyAverageExpense,
  savingsRate,
  topExpense as topExpenseOf,
  topCategoryShare,
  transactionStats,
  weekdayExpenseBreakdown,
  type Period,
} from "@/lib/finance/aggregate";
import type { TransactionWithCategory } from "@/lib/queries/finance";

/** All the period-scoped aggregation FinanceClient's summary/insights/trend
 * sections need, derived from the already-reconciled transaction list (see
 * useFinanceTransactions) — kept separate so the domain math can be reasoned
 * about (and eventually tested) independently of fetching or presentation. */
export function useFinancePeriodStats(
  allTransactions: TransactionWithCategory[],
  period: Period,
  customRange: { from: string; to: string },
  today: string
) {
  const { from, to } = periodRange(period, today, customRange);
  const inRange = useMemo(() => filterByRange(allTransactions, from, to), [allTransactions, from, to]);
  const totals = useMemo(() => summarizeTransactions(inRange), [inRange]);
  const buckets = useMemo(() => bucketTransactions(inRange, bucketForPeriod(period)), [inRange, period]);
  const groups = useMemo(() => groupByDate(inRange), [inRange]);

  // Budgets are always tracked against the current calendar month, not
  // whatever period the ledger view is filtered to (a "week" or "year"
  // view of spend wouldn't make sense against a monthly limit) — see
  // lib/finance/budgets.ts.
  const spentByCategory = useMemo(() => {
    const monthFrom = startOfMonth(today);
    const monthTo = endOfMonth(today);
    const monthTotals = summarizeTransactions(filterByRange(allTransactions, monthFrom, monthTo));
    return new Map(monthTotals.byCategory.map((c) => [c.categoryId, c.total]));
  }, [allTransactions, today]);

  // Everything the collapsed "more stats" panel needs — derived from the
  // same inRange/totals already computed above, plus one extra slice for
  // the previous-period comparison. Kept as plain useMemo values (not a
  // separate component's state) so FinanceInsights stays a pure renderer.
  const spansMultipleDays = daysBetween(from, to) >= 1;
  const comparison = useMemo(() => {
    const { from: prevFrom, to: prevTo } = previousPeriodRange(period, today, customRange);
    const previous = summarizeTransactions(filterByRange(allTransactions, prevFrom, prevTo));
    if (previous.expense <= 0) return null;
    const changePct = Math.round(((totals.expense - previous.expense) / previous.expense) * 100);
    return { current: totals.expense, previous: previous.expense, changePct };
  }, [allTransactions, period, today, customRange, totals.expense]);
  const dailyAverage = spansMultipleDays ? dailyAverageExpense(inRange, from, to) : 0;
  const savings = savingsRate(totals);
  const topExpense = useMemo(() => topExpenseOf(inRange), [inRange]);
  const topCategory = topCategoryShare(totals);
  const txStats = useMemo(() => transactionStats(inRange), [inRange]);
  const weekdayData = daysBetween(from, to) >= 6 ? weekdayExpenseBreakdown(inRange) : null;

  return {
    from,
    to,
    inRange,
    totals,
    buckets,
    groups,
    spentByCategory,
    comparison,
    dailyAverage,
    savings,
    topExpense,
    topCategory,
    txStats,
    weekdayData,
  };
}
