import { describe, expect, it } from "vitest";
import { swrKeys } from "./keys";

describe("swrKeys", () => {
  it("produces structurally stable keys for the same inputs", () => {
    expect(swrKeys.habitsList("2026-07-13")).toEqual(swrKeys.habitsList("2026-07-13"));
    expect(swrKeys.financeTransactions()).toEqual(swrKeys.financeTransactions());
  });

  it("normalizes optional filters to empty strings, not undefined, so cache hits are consistent", () => {
    const a = swrKeys.history("2026-07-13", "", "", 90);
    const b = swrKeys.history("2026-07-13", "", "", 90);
    expect(a).toEqual(b);
    expect(a).toEqual(["history", "2026-07-13", "", "", 90]);
  });

  it("changes shape when any argument changes, so different filters miss the cache", () => {
    const a = swrKeys.history("2026-07-13", "habit-1", "", 90);
    const b = swrKeys.history("2026-07-13", "habit-2", "", 90);
    expect(a).not.toEqual(b);
  });

  it("focusHeader and categories are shared, unkeyed identifiers reused across routes", () => {
    expect(swrKeys.focusHeader()).toEqual(["focus:header"]);
    expect(swrKeys.categories()).toEqual(["habits:categories"]);
  });

  it("keys a given day's today view distinctly from another day", () => {
    expect(swrKeys.todayHabits("2026-07-13")).not.toEqual(swrKeys.todayHabits("2026-07-12"));
  });
});
