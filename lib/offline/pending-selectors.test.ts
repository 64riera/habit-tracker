import { describe, expect, it } from "vitest";
import { pendingMutationsByDomain, pendingFocusSession, buildGhostGymSession, applyPendingGymSessionEdit } from "./pending-selectors";
import type { QueuedMutation, QueuedRecord } from "./db";
import type { StartFocusSessionValues } from "@/lib/validation/focus";
import type { GymSessionFormValues } from "@/lib/validation/gym";
import type { GymSessionRow } from "@/lib/queries/gym";

function record(mutation: QueuedMutation): QueuedRecord {
  // Mirrors real IndexedDB `add()` behavior (lib/offline/db.ts): when the
  // keyPath ("id") already has a value — true for every mutation that
  // carries its own pre-generated domain id, like "createHabit" or
  // "startFocusSession" — that value is used as the storage key as-is,
  // instead of being overwritten by the autoincrement generator.
  const ownId = "id" in mutation ? mutation.id : undefined;
  return { ...mutation, id: ownId ?? 1, createdAt: Date.now() } as QueuedRecord;
}

describe("pendingMutationsByDomain", () => {
  it("returns all-zero counts for an empty queue", () => {
    expect(pendingMutationsByDomain([])).toEqual({
      habits: 0,
      routines: 0,
      tasks: 0,
      finance: 0,
      categories: 0,
      focus: 0,
      gym: 0,
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
      record({ type: "startFocusSession", id: "f1", values: {} as never }),
      record({ type: "createGymSession", id: "g1", values: {} as never }),
    ];
    expect(pendingMutationsByDomain(queue)).toEqual({
      habits: 2,
      routines: 1,
      tasks: 2,
      finance: 1,
      categories: 1,
      focus: 1,
      gym: 1,
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

describe("pendingFocusSession", () => {
  const startValues: StartFocusSessionValues = { mode: "countdown", durationMinutes: 25, habitId: "", categoryId: "" };

  it("returns undefined when there's no pending focus mutation", () => {
    expect(pendingFocusSession([], "2026-07-13")).toBeUndefined();
    const queue: QueuedRecord[] = [record({ type: "createHabit", id: "h1", values: {} as never })];
    expect(pendingFocusSession(queue, "2026-07-13")).toBeUndefined();
  });

  it("builds a running ghost session from a lone start mutation", () => {
    const queue: QueuedRecord[] = [record({ type: "startFocusSession", id: "f1", values: startValues })];
    const session = pendingFocusSession(queue, "2026-07-13");
    expect(session).not.toBeNull();
    expect(session?.id).toBe("f1");
    expect(session?.status).toBe("running");
    expect(session?.date).toBe("2026-07-13");
  });

  it("folds a start followed by a pause into a paused ghost session", () => {
    const queue: QueuedRecord[] = [
      record({ type: "startFocusSession", id: "f1", values: startValues }),
      record({ type: "pauseFocusSession" }),
    ];
    const session = pendingFocusSession(queue, "2026-07-13");
    expect(session?.status).toBe("paused");
  });

  it("folds a start followed by finish/cancel to null (no longer active)", () => {
    const finished: QueuedRecord[] = [
      record({ type: "startFocusSession", id: "f1", values: startValues }),
      record({ type: "finishFocusSession" }),
    ];
    expect(pendingFocusSession(finished, "2026-07-13")).toBeNull();

    const cancelled: QueuedRecord[] = [
      record({ type: "startFocusSession", id: "f1", values: startValues }),
      record({ type: "cancelFocusSession" }),
    ];
    expect(pendingFocusSession(cancelled, "2026-07-13")).toBeNull();
  });
});

describe("gym sessions", () => {
  const values: GymSessionFormValues = {
    date: "2026-07-13",
    exercises: [
      { name: "Pecho inclinado", sets: [{ weight: "12.5", reps: 12 }, { weight: "12.5", reps: 10 }] },
      { name: "Press militar", note: "cuidar muñeca", sets: [{ weight: "29", reps: 10 }] },
    ],
  };

  it("builds a ghost session with the submitted date and exercises", () => {
    const ghost = buildGhostGymSession("g1", values);
    expect(ghost.id).toBe("g1");
    expect(ghost.date).toBe("2026-07-13");
    expect(ghost.exercises).toHaveLength(2);
    expect(ghost.exercises[1].note).toBe("cuidar muñeca");
  });

  it("overlays a pending edit on top of the real session", () => {
    const real: GymSessionRow = {
      id: "g1",
      userId: "u1",
      date: "2026-07-01",
      exercises: [{ name: "Old exercise", sets: [{ weight: "10", reps: 5 }] }],
      createdAt: "2026-07-01T00:00:00.000Z",
    };
    const edited = applyPendingGymSessionEdit(real, values);
    expect(edited.id).toBe("g1");
    expect(edited.date).toBe("2026-07-13");
    expect(edited.exercises).toHaveLength(2);
  });
});
