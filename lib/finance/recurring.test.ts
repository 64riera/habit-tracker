import { describe, expect, it } from "vitest";
import { occurrencesInRange, dueOccurrences, type RecurringRuleLike } from "./recurring";

describe("occurrencesInRange", () => {
  it("monthly: one occurrence per month on the configured day", () => {
    const rule: RecurringRuleLike = {
      recurrenceType: "monthly",
      dayOfMonth: 5,
      month: null,
      startDate: "2026-01-01",
      lastGeneratedDate: null,
    };
    expect(occurrencesInRange(rule, "2026-01-01", "2026-04-30")).toEqual([
      "2026-01-05",
      "2026-02-05",
      "2026-03-05",
      "2026-04-05",
    ]);
  });

  it("monthly: clamps day 31 to the last day of shorter months", () => {
    const rule: RecurringRuleLike = {
      recurrenceType: "monthly",
      dayOfMonth: 31,
      month: null,
      startDate: "2026-01-01",
      lastGeneratedDate: null,
    };
    // Feb 2026 has 28 days, April has 30.
    expect(occurrencesInRange(rule, "2026-01-01", "2026-04-30")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("yearly: one occurrence on the configured month/day, clamping Feb 29 outside leap years", () => {
    const rule: RecurringRuleLike = {
      recurrenceType: "yearly",
      dayOfMonth: 29,
      month: 2,
      startDate: "2023-01-01",
      lastGeneratedDate: null,
    };
    expect(occurrencesInRange(rule, "2023-01-01", "2024-12-31")).toEqual(["2023-02-28", "2024-02-29"]);
  });

  it("returns nothing when from is after to", () => {
    const rule: RecurringRuleLike = {
      recurrenceType: "monthly",
      dayOfMonth: 1,
      month: null,
      startDate: "2026-01-01",
      lastGeneratedDate: null,
    };
    expect(occurrencesInRange(rule, "2026-02-01", "2026-01-01")).toEqual([]);
  });
});

describe("dueOccurrences", () => {
  it("starts from startDate when never generated", () => {
    const rule: RecurringRuleLike = {
      recurrenceType: "monthly",
      dayOfMonth: 1,
      month: null,
      startDate: "2026-01-01",
      lastGeneratedDate: null,
    };
    expect(dueOccurrences(rule, "2026-03-15")).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("resumes the day after lastGeneratedDate, never re-emitting an already-processed occurrence", () => {
    const rule: RecurringRuleLike = {
      recurrenceType: "monthly",
      dayOfMonth: 1,
      month: null,
      startDate: "2026-01-01",
      lastGeneratedDate: "2026-02-01",
    };
    expect(dueOccurrences(rule, "2026-03-15")).toEqual(["2026-03-01"]);
  });

  it("is empty when the cursor is already caught up to today", () => {
    const rule: RecurringRuleLike = {
      recurrenceType: "monthly",
      dayOfMonth: 1,
      month: null,
      startDate: "2026-01-01",
      lastGeneratedDate: "2026-03-15",
    };
    expect(dueOccurrences(rule, "2026-03-15")).toEqual([]);
  });
});
