import { describe, expect, it } from "vitest";
import { budgetStatus } from "./budgets";

describe("budgetStatus", () => {
  it("is ok comfortably under the limit", () => {
    const status = budgetStatus(50, 200);
    expect(status).toMatchObject({ pct: 25, state: "ok", overBy: 0 });
  });

  it("switches to warning at the 80% threshold", () => {
    expect(budgetStatus(159.99, 200).state).toBe("ok");
    expect(budgetStatus(160, 200).state).toBe("warning");
  });

  it("is over past 100%, with overBy the exact excess", () => {
    const status = budgetStatus(245, 200);
    expect(status.state).toBe("over");
    expect(status.pct).toBe(123);
    expect(status.overBy).toBeCloseTo(45);
  });

  it("treats an unset/zero limit as no budget (ratio 0, never over)", () => {
    expect(budgetStatus(500, 0)).toMatchObject({ ratio: 0, pct: 0, state: "ok", overBy: 0 });
  });
});
