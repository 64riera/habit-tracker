"use client";

import type { QueuedMutation } from "@/lib/offline/db";
import { logHabit, deleteLog, freezeHabitDay } from "@/lib/actions/logs";
import {
  createHabitCore,
  updateHabitCore,
  archiveHabitCore,
  restoreHabit,
  togglePinHabit,
  reorderHabits,
} from "@/lib/actions/habits";
import { setCategoryHidden } from "@/lib/actions/categories";
import { createRoutineCore, updateRoutineCore, deleteRoutineCore } from "@/lib/actions/routines";
import { createTaskCore, updateTaskCore, deleteTaskCore, toggleTaskCore } from "@/lib/actions/tasks";
import {
  createTransactionCore,
  updateTransactionCore,
  deleteTransactionCore,
} from "@/lib/actions/transactions";
import {
  startFocusSessionCore,
  pauseFocusSession,
  resumeFocusSession,
  endBreakEarly,
  finishFocusSession,
  cancelFocusSession,
} from "@/lib/actions/focus";
import { createGymSessionCore, updateGymSessionCore, deleteGymSessionCore } from "@/lib/actions/gym";
import { startTimer, pauseTimer, resumeTimer, cancelTimer } from "@/lib/actions/metronome";
import type { AchievementType } from "@/lib/achievements";

export type ReplayResult = { unlocked?: AchievementType[]; freezeQuotaExhausted?: boolean } | void;

/**
 * Mapped type over the `QueuedMutation` discriminant: adding a variant
 * without registering its replay here is a compile-time error (Open/Closed).
 */
type Registry = {
  [K in QueuedMutation["type"]]: (mutation: Extract<QueuedMutation, { type: K }>) => Promise<ReplayResult>;
};

const registry: Registry = {
  log: (m) => logHabit(m.input),
  delete: (m) => deleteLog(m.habitId, m.date),
  freeze: async (m) => {
    const result = await freezeHabitDay(m.habitId, m.date);
    return result.ok ? { unlocked: result.unlocked } : { freezeQuotaExhausted: true };
  },
  // The `{error?}` result from the *Core functions only makes sense on the online path
  // (a form just validated on the client): it's deliberately discarded in the offline replay.
  createHabit: async (m) => {
    await createHabitCore(m.id, m.values);
  },
  updateHabit: async (m) => {
    await updateHabitCore(m.habitId, m.values);
  },
  archiveHabit: (m) => archiveHabitCore(m.habitId),
  restoreHabit: (m) => restoreHabit(m.habitId),
  togglePinHabit: (m) => togglePinHabit(m.habitId, m.pinned),
  reorderHabits: (m) => reorderHabits(m.orderedIds),
  setCategoryHidden: (m) => setCategoryHidden(m.categoryId, m.hidden),
  createRoutine: async (m) => {
    await createRoutineCore(m.id, m.values);
  },
  updateRoutine: async (m) => {
    await updateRoutineCore(m.routineId, m.values);
  },
  deleteRoutine: (m) => deleteRoutineCore(m.routineId),
  createTask: async (m) => {
    await createTaskCore(m.id, m.values);
  },
  updateTask: async (m) => {
    await updateTaskCore(m.taskId, m.values);
  },
  deleteTask: (m) => deleteTaskCore(m.taskId),
  toggleTask: (m) => toggleTaskCore(m.taskId, m.periodKey, m.done),
  createTransaction: async (m) => {
    await createTransactionCore(m.id, m.values);
  },
  updateTransaction: async (m) => {
    await updateTransactionCore(m.transactionId, m.values);
  },
  deleteTransaction: (m) => deleteTransactionCore(m.transactionId),
  // Reward-unlock toasts for a session finished while offline don't fire
  // synchronously (unlike the online "Finish" button, which reads them
  // straight from the response) — the reward is still granted server-side
  // regardless, and the next natural resync picks up the closed session.
  startFocusSession: async (m) => {
    await startFocusSessionCore(m.id, m.values);
  },
  pauseFocusSession: () => pauseFocusSession(),
  resumeFocusSession: () => resumeFocusSession(),
  endBreakEarly: () => endBreakEarly(),
  finishFocusSession: async () => {
    await finishFocusSession();
  },
  cancelFocusSession: () => cancelFocusSession(),
  createGymSession: async (m) => {
    await createGymSessionCore(m.id, m.values);
  },
  updateGymSession: async (m) => {
    await updateGymSessionCore(m.sessionId, m.values);
  },
  deleteGymSession: (m) => deleteGymSessionCore(m.sessionId),
  // No ack needed on success: the timer's own ghost preview (built the
  // instant this was queued, see lib/offline/pending-selectors.ts) is
  // already showing the right thing — this replay just makes it real.
  startMetronomeTimer: async (m) => {
    await startTimer(m.durationSeconds);
  },
  pauseMetronomeTimer: async () => {
    await pauseTimer();
  },
  resumeMetronomeTimer: async () => {
    await resumeTimer();
  },
  cancelMetronomeTimer: () => cancelTimer(),
};

export async function replay(mutation: QueuedMutation): Promise<ReplayResult> {
  const handler = registry[mutation.type] as (m: QueuedMutation) => Promise<ReplayResult>;
  return handler(mutation);
}
