import { describe, expect, it } from "vitest";
import { getTodayDateString } from "./date";

describe("getTodayDateString", () => {
  it("stays on the user's local calendar day even after the server's UTC day has already rolled over", () => {
    // 2026-07-14T00:30:00Z is already "July 14" in UTC, but only
    // 2026-07-13T19:30 in America/Bogota (UTC-5) — this is exactly the
    // reported bug: a server evaluating "today" against its own (UTC)
    // clock instead of the user's timezone would say July 14 hours before
    // the user's actual local midnight. cutoffHour=0 isolates the pure
    // calendar-day-in-zone comparison from the cutoff-hour behavior
    // exercised by the other cases below.
    const now = new Date("2026-07-14T00:30:00Z");
    expect(getTodayDateString(0, "America/Bogota", now)).toBe("2026-07-13");
    expect(getTodayDateString(0, "UTC", now)).toBe("2026-07-14");
  });

  it("applies the cutoff hour against the local wall clock, not UTC", () => {
    // 2026-07-14T06:30:00Z is 2026-07-14T01:30 local in Bogota (UTC-5) —
    // before the 03:00 cutoff, so it should still count as the previous day.
    const now = new Date("2026-07-14T06:30:00Z");
    expect(getTodayDateString(3, "America/Bogota", now)).toBe("2026-07-13");
  });

  it("returns the local date once past the cutoff hour", () => {
    // 2026-07-14T08:30:00Z is 2026-07-14T03:30 local in Bogota — past the
    // 03:00 cutoff, so "today" becomes July 14.
    const now = new Date("2026-07-14T08:30:00Z");
    expect(getTodayDateString(3, "America/Bogota", now)).toBe("2026-07-14");
  });

  it("the same instant resolves to different calendar days in different timezones", () => {
    const now = new Date("2026-01-01T04:00:00Z");
    expect(getTodayDateString(0, "Pacific/Kiritimati", now)).toBe("2026-01-01");
    expect(getTodayDateString(0, "Etc/GMT+12", now)).toBe("2025-12-31");
  });
});
