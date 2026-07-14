import { describe, expect, it } from "vitest";
import {
  previousPeriodRange,
  dailyAverageExpense,
  savingsRate,
  topExpense,
  topCategoryShare,
  transactionStats,
  weekdayExpenseBreakdown,
  summarizeTransactions,
} from "./aggregate";

// 2026-07-13 is a Monday.
const TODAY = "2026-07-13";

describe("previousPeriodRange", () => {
  it("day: the day before", () => {
    expect(previousPeriodRange("day", TODAY)).toEqual({ from: "2026-07-12", to: "2026-07-12" });
  });

  it("week: the previous ISO week, same length", () => {
    expect(previousPeriodRange("week", TODAY)).toEqual({ from: "2026-07-06", to: "2026-07-12" });
  });

  it("month: the previous calendar month, not a fixed 30-day window", () => {
    // July has 31 days; June has 30 — a naive "same length" shift would land on May 31.
    expect(previousPeriodRange("month", TODAY)).toEqual({ from: "2026-06-01", to: "2026-06-30" });
  });

  it("year: the previous calendar year", () => {
    expect(previousPeriodRange("year", TODAY)).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });

  it("custom: an equal-length window immediately before", () => {
    const custom = { from: "2026-07-10", to: "2026-07-13" }; // 4 days
    expect(previousPeriodRange("custom", TODAY, custom)).toEqual({ from: "2026-07-06", to: "2026-07-09" });
  });
});

describe("dailyAverageExpense", () => {
  it("divides total expense by calendar days in range, ignoring income", () => {
    const rows = [
      { date: "2026-07-01", type: "expense" as const, amount: 100, categoryId: "a" },
      { date: "2026-07-02", type: "expense" as const, amount: 50, categoryId: "a" },
      { date: "2026-07-02", type: "income" as const, amount: 1000, categoryId: null },
    ];
    // 3-day range (07-01..07-03), 150 total expense
    expect(dailyAverageExpense(rows, "2026-07-01", "2026-07-03")).toBe(50);
  });
});

describe("savingsRate", () => {
  it("is null with no income (nothing to divide by)", () => {
    const totals = summarizeTransactions([{ date: TODAY, type: "expense", amount: 10, categoryId: "a" }]);
    expect(savingsRate(totals)).toBeNull();
  });

  it("is 0 when every peso of income was spent", () => {
    const totals = summarizeTransactions([
      { date: TODAY, type: "income", amount: 100, categoryId: null },
      { date: TODAY, type: "expense", amount: 100, categoryId: "a" },
    ]);
    expect(savingsRate(totals)).toBe(0);
  });

  it("can go negative when expenses exceed income", () => {
    const totals = summarizeTransactions([
      { date: TODAY, type: "income", amount: 100, categoryId: null },
      { date: TODAY, type: "expense", amount: 150, categoryId: "a" },
    ]);
    expect(savingsRate(totals)).toBe(-50);
  });
});

describe("topExpense", () => {
  it("picks the largest expense, ignoring income entirely", () => {
    const rows = [
      { date: TODAY, type: "expense" as const, amount: 30, categoryId: "a" },
      { date: TODAY, type: "income" as const, amount: 9999, categoryId: null },
      { date: TODAY, type: "expense" as const, amount: 80, categoryId: "b" },
    ];
    expect(topExpense(rows)?.amount).toBe(80);
  });

  it("is null with no expenses", () => {
    expect(topExpense([{ date: TODAY, type: "income", amount: 10, categoryId: null }])).toBeNull();
  });
});

describe("topCategoryShare", () => {
  it("computes the leading category's percentage of total expense", () => {
    const totals = summarizeTransactions([
      { date: TODAY, type: "expense", amount: 75, categoryId: "food" },
      { date: TODAY, type: "expense", amount: 25, categoryId: "car" },
    ]);
    expect(topCategoryShare(totals)).toEqual({ categoryId: "food", total: 75, pct: 75 });
  });

  it("is null with no expenses", () => {
    expect(topCategoryShare(summarizeTransactions([]))).toBeNull();
  });
});

describe("transactionStats", () => {
  it("averages expenses and income independently", () => {
    const rows = [
      { date: TODAY, type: "expense" as const, amount: 10, categoryId: "a" },
      { date: TODAY, type: "expense" as const, amount: 30, categoryId: "a" },
      { date: TODAY, type: "income" as const, amount: 100, categoryId: null },
    ];
    expect(transactionStats(rows)).toEqual({ count: 3, avgExpense: 20, avgIncome: 100 });
  });
});

describe("weekdayExpenseBreakdown", () => {
  it("always returns all 7 weekdays in Mon..Sun order, zero-filled", () => {
    // 2026-07-13 is Monday, 2026-07-18 is Saturday
    const rows = [
      { date: "2026-07-13", type: "expense" as const, amount: 40, categoryId: "a" },
      { date: "2026-07-18", type: "expense" as const, amount: 100, categoryId: "a" },
    ];
    const result = weekdayExpenseBreakdown(rows);
    expect(result.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(result.find((d) => d.weekday === 1)?.total).toBe(40);
    expect(result.find((d) => d.weekday === 6)?.total).toBe(100);
    expect(result.find((d) => d.weekday === 2)?.total).toBe(0);
  });

  it("ignores income rows", () => {
    const rows = [{ date: TODAY, type: "income" as const, amount: 500, categoryId: null }];
    expect(weekdayExpenseBreakdown(rows).every((d) => d.total === 0)).toBe(true);
  });
});
