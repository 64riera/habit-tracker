"use client";

import type { LogInput } from "@/lib/actions/logs";
import type { HabitFormValues } from "@/lib/validation/habit";
import type { CategoryFormValues } from "@/lib/validation/category";
import type { RoutineFormValues } from "@/lib/validation/routine";

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
  | { type: "createCategory"; id: string; values: CategoryFormValues }
  | { type: "updateCategory"; categoryId: string; values: CategoryFormValues }
  | { type: "deleteCategory"; categoryId: string }
  | { type: "createRoutine"; id: string; values: RoutineFormValues }
  | { type: "updateRoutine"; routineId: string; values: RoutineFormValues }
  | { type: "deleteRoutine"; routineId: string };

export type QueuedRecord = QueuedMutation & { id: number; createdAt: number };

const DB_NAME = "habito-offline";
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
  return result.sort((a, b) => a.id - b.id);
}

export async function removeQueuedMutation(id: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
