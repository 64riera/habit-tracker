import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, monthKey, yearKey } from "@/lib/date";

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
