import { describe, expect, it } from "vitest";
import { habitFormSchema } from "./habit";

const base = {
  name: "Read",
  goalType: "binary" as const,
  frequencyType: "weekdays" as const,
  startDate: "2026-07-01",
};

describe("habitFormSchema — weekdays", () => {
  it("rejects a weekdays habit with no day selected", () => {
    const result = habitFormSchema.safeParse({ ...base, weekdays: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a weekdays habit with weekdays omitted entirely", () => {
    const result = habitFormSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it("accepts a weekdays habit with at least one day", () => {
    const result = habitFormSchema.safeParse({ ...base, weekdays: [1, 3, 5] });
    expect(result.success).toBe(true);
  });

  it("doesn't require weekdays for other frequency types", () => {
    const result = habitFormSchema.safeParse({ ...base, frequencyType: "daily" });
    expect(result.success).toBe(true);
  });
});
