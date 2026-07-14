import { describe, expect, it } from "vitest";
import { pendingMutationsByDomain } from "./pending-selectors";
import type { QueuedMutation, QueuedRecord } from "./db";

function record(mutation: QueuedMutation): QueuedRecord {
  // TS can't narrow a spread of a generically-typed union back to the
  // matching QueuedRecord branch — safe here since `mutation` is always a
  // complete, valid QueuedMutation and we're only adding the two id fields.
  return { ...mutation, id: 1, createdAt: Date.now() } as QueuedRecord;
}

describe("pendingMutationsByDomain", () => {
  it("returns all-zero counts for an empty queue", () => {
    expect(pendingMutationsByDomain([])).toEqual({
      habits: 0,
      routines: 0,
      tasks: 0,
      finance: 0,
      categories: 0,
    });
  });

  it("groups every mutation type into its correct domain", () => {
    const queue: QueuedRecord[] = [
      record({ type: "log", input: { habitId: "h1", date: "2026-07-13", status: "done" } }),
      record({ type: "createHabit", id: "h2", values: {} as never }),
      record({ type: "createRoutine", id: "r1", values: {} as never }),
      record({ type: "createTask", id: "t1", values: {} as never }),
      record({ type: "toggleTask", taskId: "t1", periodKey: "2026-07-13", done: true }),
      record({ type: "createTransaction", id: "x1", values: {} as never }),
      record({ type: "setCategoryHidden", categoryId: "c1", hidden: true }),
    ];
    expect(pendingMutationsByDomain(queue)).toEqual({
      habits: 2,
      routines: 1,
      tasks: 2,
      finance: 1,
      categories: 1,
    });
  });

  it("counts multiple mutations in the same domain independently", () => {
    const queue: QueuedRecord[] = [
      record({ type: "deleteTransaction", transactionId: "x1" }),
      record({ type: "updateTransaction", transactionId: "x2", values: {} as never }),
      record({ type: "createTransaction", id: "x3", values: {} as never }),
    ];
    expect(pendingMutationsByDomain(queue).finance).toBe(3);
  });
});
