import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  monthKey,
  yearKey,
  addDays,
  daysBetween,
  isoWeekday,
} from "@/lib/date";

export type Period = "day" | "week" | "month" | "year" | "custom";
export type Bucket = "day" | "week" | "month" | "year";

/** Pure — safe to run on the client so switching periods (day/week/month/year/
 * custom range) never needs a network round-trip: the whole dataset is
 * fetched once (see getTransactions in lib/queries/finance.ts) and every
 * period view is just a different slice/reduce over it. That's what keeps
 * the reports usable offline, not just the create/edit forms. */
export function periodRange(period: Period, today: string, custom?: { from: string; to: string }): { from: string; to: string } {
  switch (period) {
    case "day":
      return { from: today, to: today };
    case "week":
      return { from: startOfWeek(today), to: endOfWeek(today) };
    case "month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "year":
      return { from: startOfYear(today), to: endOfYear(today) };
    case "custom":
      return custom ?? { from: today, to: today };
  }
}

export function filterByRange<T extends { date: string }>(rows: T[], from: string, to: string): T[] {
  return rows.filter((r) => r.date >= from && r.date <= to);
}

/** The equivalent-length window immediately before the selected period —
 * "last week" for "week", the previous calendar month for "month", etc.
 * Same shifting logic already used for Focus's week/month comparisons (see
 * getFocusWeekSummary/getFocusMonthSummary in lib/queries/focus-stats.ts),
 * generalized here to cover day/year/custom too since Finance's period
 * selector has more options than Focus's. */
export function previousPeriodRange(period: Period, today: string, custom?: { from: string; to: string }): { from: string; to: string } {
  const { from } = periodRange(period, today, custom);
  switch (period) {
    case "day":
      return { from: addDays(from, -1), to: addDays(from, -1) };
    case "week": {
      const prevEnd = addDays(from, -1);
      return { from: startOfWeek(prevEnd), to: prevEnd };
    }
    case "month": {
      const prevEnd = addDays(from, -1);
      return { from: startOfMonth(prevEnd), to: prevEnd };
    }
    case "year": {
      const prevEnd = addDays(from, -1);
      return { from: startOfYear(prevEnd), to: prevEnd };
    }
    case "custom": {
      const { to } = periodRange(period, today, custom);
      const length = daysBetween(from, to) + 1;
      const prevTo = addDays(from, -1);
      return { from: addDays(prevTo, -(length - 1)), to: prevTo };
    }
  }
}

export type TransactionLike = { date: string; type: "income" | "expense"; amount: number; categoryId: string | null };

export type PeriodTotals = {
  income: number;
  expense: number;
  balance: number;
  byCategory: { categoryId: string; total: number }[];
};

export function summarizeTransactions(rows: TransactionLike[]): PeriodTotals {
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();

  for (const row of rows) {
    if (row.type === "income") {
      income += row.amount;
    } else {
      expense += row.amount;
      if (row.categoryId) byCategory.set(row.categoryId, (byCategory.get(row.categoryId) ?? 0) + row.amount);
    }
  }

  return {
    income,
    expense,
    balance: income - expense,
    byCategory: Array.from(byCategory, ([categoryId, total]) => ({ categoryId, total })).sort(
      (a, b) => b.total - a.total
    ),
  };
}

function bucketKey(date: string, bucket: Bucket): string {
  switch (bucket) {
    case "day":
      return date;
    case "week":
      return startOfWeek(date);
    case "month":
      return monthKey(date);
    case "year":
      return yearKey(date);
  }
}

export type BucketTotal = { key: string; income: number; expense: number };

/** Buckets a range by day/week/month/year for the trend chart — e.g. one bar
 * per day for a month view, one per month for a year view. */
export function bucketTransactions(rows: TransactionLike[], bucket: Bucket): BucketTotal[] {
  const totals = new Map<string, { income: number; expense: number }>();
  for (const row of rows) {
    const key = bucketKey(row.date, bucket);
    const entry = totals.get(key) ?? { income: 0, expense: 0 };
    if (row.type === "income") entry.income += row.amount;
    else entry.expense += row.amount;
    totals.set(key, entry);
  }
  return Array.from(totals, ([key, v]) => ({ key, ...v })).sort((a, b) => a.key.localeCompare(b.key));
}

/** Chart granularity that makes sense for each period — a year view with
 * 365 daily bars would be unreadable, so it rolls up to months instead. */
export function bucketForPeriod(period: Period): Bucket {
  return period === "year" ? "month" : "day";
}

/** Average expense per day across the range — the simple denominator
 * (calendar days in range, not "days with a transaction") is what makes
 * "you spend ~$X/day" comparable across periods of different lengths. */
export function dailyAverageExpense(rows: TransactionLike[], from: string, to: string): number {
  const totalExpense = rows.filter((r) => r.type === "expense").reduce((sum, r) => sum + r.amount, 0);
  const days = daysBetween(from, to) + 1;
  return days > 0 ? totalExpense / days : 0;
}

/** Share of income actually kept, as a percentage — `null` (not 0) when
 * there's no income to divide by, so callers can distinguish "no data" from
 * "spent every peso" (0%). */
export function savingsRate(totals: PeriodTotals): number | null {
  if (totals.income <= 0) return null;
  return Math.round((totals.balance / totals.income) * 100);
}

/** The single largest expense in the range — generic over any row shape
 * that carries at least the TransactionLike fields, so the caller (which
 * has the richer TransactionWithCategory rows, including note/id) can pass
 * those straight through instead of losing fields to a narrower return type. */
export function topExpense<T extends TransactionLike>(rows: T[]): T | null {
  let top: T | null = null;
  for (const row of rows) {
    if (row.type === "expense" && (!top || row.amount > top.amount)) top = row;
  }
  return top;
}

/** The biggest category's share of total expense — `null` when there's
 * nothing to highlight (no expenses in range). */
export function topCategoryShare(totals: PeriodTotals): { categoryId: string; total: number; pct: number } | null {
  const top = totals.byCategory[0];
  if (!top || totals.expense <= 0) return null;
  return { ...top, pct: Math.round((top.total / totals.expense) * 100) };
}

export type TransactionStats = { count: number; avgExpense: number; avgIncome: number };

export function transactionStats(rows: TransactionLike[]): TransactionStats {
  const expenseRows = rows.filter((r) => r.type === "expense");
  const incomeRows = rows.filter((r) => r.type === "income");
  const sum = (arr: TransactionLike[]) => arr.reduce((s, r) => s + r.amount, 0);
  return {
    count: rows.length,
    avgExpense: expenseRows.length > 0 ? sum(expenseRows) / expenseRows.length : 0,
    avgIncome: incomeRows.length > 0 ? sum(incomeRows) / incomeRows.length : 0,
  };
}

export type WeekdayExpense = { weekday: number; total: number };

/** Total expense per ISO weekday (1=Monday..7=Sunday), always all 7 entries
 * in order (zero-filled) so the caller can render a fixed-width chart
 * without special-casing missing days. */
export function weekdayExpenseBreakdown(rows: TransactionLike[]): WeekdayExpense[] {
  const totals = new Map<number, number>();
  for (const row of rows) {
    if (row.type !== "expense") continue;
    const wd = isoWeekday(row.date);
    totals.set(wd, (totals.get(wd) ?? 0) + row.amount);
  }
  return Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, total: totals.get(i + 1) ?? 0 }));
}
