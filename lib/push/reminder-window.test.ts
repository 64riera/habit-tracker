import { describe, expect, it } from "vitest";
import { isReminderDue } from "./reminder-window";

describe("isReminderDue", () => {
  it("is due at the exact reminder minute", () => {
    expect(isReminderDue("08:00", "08:00", 15)).toBe(true);
  });

  it("is due just before the window closes", () => {
    expect(isReminderDue("08:00", "08:14", 15)).toBe(true);
  });

  it("is not due once the window has closed", () => {
    expect(isReminderDue("08:00", "08:15", 15)).toBe(false);
  });

  it("is not due before the reminder time", () => {
    expect(isReminderDue("08:00", "07:59", 15)).toBe(false);
  });

  it("handles the midnight wraparound", () => {
    expect(isReminderDue("23:58", "00:05", 15)).toBe(true);
    expect(isReminderDue("23:58", "00:20", 15)).toBe(false);
  });
});
