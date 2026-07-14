import { describe, expect, it } from "vitest";
import { currentPeriodKey, isTaskApplicableToday, mostRecentApplicableDate } from "./recurrence";

describe("currentPeriodKey", () => {
  it("daily is keyed by the exact date", () => {
    const task = { recurrenceType: "daily", recurrenceConfig: null, startDate: "2026-07-01" };
    expect(currentPeriodKey(task, "2026-07-13")).toBe("2026-07-13");
  });

  it("weekly is keyed by the Monday of that ISO week", () => {
    const task = { recurrenceType: "weekly", recurrenceConfig: null, startDate: "2026-07-01" };
    // 2026-07-13 is a Monday
    expect(currentPeriodKey(task, "2026-07-13")).toBe("2026-07-13");
    // 2026-07-17 is a Friday of the same week
    expect(currentPeriodKey(task, "2026-07-17")).toBe("2026-07-13");
    // 2026-07-20 is the next Monday — a different period
    expect(currentPeriodKey(task, "2026-07-20")).toBe("2026-07-20");
  });

  it("monthly is keyed by year-month, regardless of dayOfMonth", () => {
    const task = {
      recurrenceType: "monthly",
      recurrenceConfig: JSON.stringify({ dayOfMonth: 15 }),
      startDate: "2026-01-01",
    };
    expect(currentPeriodKey(task, "2026-07-01")).toBe("2026-07");
    expect(currentPeriodKey(task, "2026-07-31")).toBe("2026-07");
  });

  it("yearly is keyed by year, regardless of month/day", () => {
    const task = {
      recurrenceType: "yearly",
      recurrenceConfig: JSON.stringify({ month: 3, day: 5 }),
      startDate: "2020-01-01",
    };
    expect(currentPeriodKey(task, "2026-01-01")).toBe("2026");
    expect(currentPeriodKey(task, "2026-12-31")).toBe("2026");
  });

  it("custom_interval carries the same period key across non-applicable days", () => {
    const task = {
      recurrenceType: "custom_interval",
      recurrenceConfig: JSON.stringify({ intervalDays: 3 }),
      startDate: "2026-07-10", // applicable: 07-10, 07-13, 07-16, ...
    };
    expect(currentPeriodKey(task, "2026-07-10")).toBe("2026-07-10");
    expect(currentPeriodKey(task, "2026-07-11")).toBe("2026-07-10");
    expect(currentPeriodKey(task, "2026-07-12")).toBe("2026-07-10");
    expect(currentPeriodKey(task, "2026-07-13")).toBe("2026-07-13");
  });

  it("custom_weekdays carries the same period key across non-selected days", () => {
    const task = {
      recurrenceType: "custom_weekdays",
      recurrenceConfig: JSON.stringify({ weekdays: [1, 3, 5] }), // Mon, Wed, Fri
      startDate: "2026-07-01",
    };
    // 2026-07-13 Mon, 07-14 Tue, 07-15 Wed
    expect(currentPeriodKey(task, "2026-07-13")).toBe("2026-07-13");
    expect(currentPeriodKey(task, "2026-07-14")).toBe("2026-07-13");
    expect(currentPeriodKey(task, "2026-07-15")).toBe("2026-07-15");
  });
});

describe("isTaskApplicableToday", () => {
  it("daily/weekly/monthly/yearly are always applicable", () => {
    for (const recurrenceType of ["daily", "weekly", "monthly", "yearly"]) {
      const task = { recurrenceType, recurrenceConfig: null, startDate: "2026-01-01" };
      expect(isTaskApplicableToday(task, "2026-07-13")).toBe(true);
    }
  });

  it("custom_interval only applies every N days from startDate", () => {
    const task = {
      recurrenceType: "custom_interval",
      recurrenceConfig: JSON.stringify({ intervalDays: 3 }),
      startDate: "2026-07-10",
    };
    expect(isTaskApplicableToday(task, "2026-07-10")).toBe(true);
    expect(isTaskApplicableToday(task, "2026-07-11")).toBe(false);
    expect(isTaskApplicableToday(task, "2026-07-13")).toBe(true);
  });

  it("custom_weekdays only applies on the selected ISO weekdays", () => {
    const task = {
      recurrenceType: "custom_weekdays",
      recurrenceConfig: JSON.stringify({ weekdays: [1, 5] }), // Mon, Fri
      startDate: "2026-07-01",
    };
    expect(isTaskApplicableToday(task, "2026-07-13")).toBe(true); // Monday
    expect(isTaskApplicableToday(task, "2026-07-14")).toBe(false); // Tuesday
    expect(isTaskApplicableToday(task, "2026-07-17")).toBe(true); // Friday
  });
});

describe("mostRecentApplicableDate", () => {
  it("returns today itself when today is applicable", () => {
    const task = {
      recurrenceType: "custom_weekdays",
      recurrenceConfig: JSON.stringify({ weekdays: [1] }),
      startDate: "2026-07-01",
    };
    expect(mostRecentApplicableDate(task, "2026-07-13")).toBe("2026-07-13");
  });

  it("walks back to the last applicable weekday", () => {
    const task = {
      recurrenceType: "custom_weekdays",
      recurrenceConfig: JSON.stringify({ weekdays: [1] }), // Monday only
      startDate: "2026-07-01",
    };
    expect(mostRecentApplicableDate(task, "2026-07-17")).toBe("2026-07-13"); // Friday -> back to Monday
  });
});
