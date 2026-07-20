"use client";

import type { LogInput } from "@/lib/habits/log-write";
import type { HabitFormValues } from "@/lib/validation/habit";
import type { RoutineFormValues } from "@/lib/validation/routine";
import type { TaskFormValues } from "@/lib/validation/task";
import type { TransactionFormValues } from "@/lib/validation/transaction";
import type { StartFocusSessionValues } from "@/lib/validation/focus";
import type { GymSessionFormValues } from "@/lib/validation/gym";

export type QueuedMutation =
  | { type: "log"; input: LogInput }
  | { type: "delete"; habitId: string; date: string }
  | { type: "freeze"; habitId: string; date: string }
  | { type: "createHabit"; id: string; values: HabitFormValues }
  | { type: "updateHabit"; habitId: string; values: HabitFormValues }
  | { type: "archiveHabit"; habitId: string }
  | { type: "restoreHabit"; habitId: string }
  | { type: "togglePinHabit"; habitId: string; pinned: boolean }
  | { type: "reorderHabits"; orderedIds: string[] }
  | { type: "setCategoryHidden"; categoryId: string; hidden: boolean }
  | { type: "createRoutine"; id: string; values: RoutineFormValues }
  | { type: "updateRoutine"; routineId: string; values: RoutineFormValues }
  | { type: "deleteRoutine"; routineId: string }
  | { type: "createTask"; id: string; values: TaskFormValues }
  | { type: "updateTask"; taskId: string; values: TaskFormValues }
  | { type: "deleteTask"; taskId: string }
  | { type: "toggleTask"; taskId: string; periodKey: string; done: boolean }
  | { type: "createTransaction"; id: string; values: TransactionFormValues }
  | { type: "updateTransaction"; transactionId: string; values: TransactionFormValues }
  | { type: "deleteTransaction"; transactionId: string }
  | { type: "startFocusSession"; id: string; values: StartFocusSessionValues }
  | { type: "pauseFocusSession" }
  | { type: "resumeFocusSession" }
  | { type: "endBreakEarly" }
  | { type: "finishFocusSession" }
  | { type: "cancelFocusSession" }
  | { type: "createGymSession"; id: string; values: GymSessionFormValues }
  | { type: "updateGymSession"; sessionId: string; values: GymSessionFormValues }
  | { type: "deleteGymSession"; sessionId: string }
  | { type: "startMetronomeTimer"; durationSeconds: number }
  | { type: "pauseMetronomeTimer" }
  | { type: "resumeMetronomeTimer" }
  | { type: "cancelMetronomeTimer" };

// The IndexedDB object store's keyPath is "id": for a mutation variant that
// already carries its own client-generated domain id (createHabit,
// startFocusSession, ...), spreading `...mutation` in enqueueMutation below
// means *that* string becomes the record's primary key; for every other
// variant, `autoIncrement` fills in a numeric one because none was present.
// So `id` here is genuinely `string | number` depending on mutation type —
// typing it as bare `number` (as before) silently resolved to `never` for
// the string-id variants via the intersection, which is unsound: `never`
// is assignable anywhere, so passing one of those ids into a `number`
// parameter type-checked without error despite being a string at runtime.
export type QueuedRecord = QueuedMutation & { id: number | string; createdAt: number };

const DB_NAME = "justgo-offline";
const STORE_NAME = "mutations";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueMutation(mutation: QueuedMutation): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({ ...mutation, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getQueuedMutations(): Promise<QueuedRecord[]> {
  const db = await openDb();
  const result = await new Promise<QueuedRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as QueuedRecord[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  // Sorted by `createdAt`, not `id`: the store's keyPath ("id") holds a
  // client-generated string for mutations that carry their own domain id
  // (createHabit, startFocusSession, ...) and a numeric autoincrement value
  // for every other mutation type (see enqueueMutation/openDb) — sorting a
  // mix of strings and numbers with `a.id - b.id` silently produces NaN for
  // any string/number pair and corrupts the order. `createdAt` is always a
  // plain number set uniformly for every mutation, so it sorts correctly
  // regardless of what the id happens to be.
  return result.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueuedMutation(id: number | string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
