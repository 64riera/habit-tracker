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
import { createCategoryCore, updateCategoryCore, deleteCategoryCore } from "@/lib/actions/categories";
import { createRoutineCore, updateRoutineCore, deleteRoutineCore } from "@/lib/actions/routines";
import type { AchievementType } from "@/lib/achievements";

export type ReplayResult = { unlocked?: AchievementType[]; freezeQuotaExhausted?: boolean } | void;

/**
 * Mapped type sobre el discriminante de `QueuedMutation`: agregar una variante
 * sin registrar aquí su replay es un error de compilación (Open/Closed).
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
  // El resultado `{error?}` de los *Core solo tiene sentido en la ruta online (formulario
  // recién validado en el cliente): en el replay offline se descarta a propósito.
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
  createCategory: async (m) => {
    await createCategoryCore(m.id, m.values);
  },
  updateCategory: async (m) => {
    await updateCategoryCore(m.categoryId, m.values);
  },
  deleteCategory: (m) => deleteCategoryCore(m.categoryId),
  createRoutine: async (m) => {
    await createRoutineCore(m.id, m.values);
  },
  updateRoutine: async (m) => {
    await updateRoutineCore(m.routineId, m.values);
  },
  deleteRoutine: (m) => deleteRoutineCore(m.routineId),
};

export async function replay(mutation: QueuedMutation): Promise<ReplayResult> {
  const handler = registry[mutation.type] as (m: QueuedMutation) => Promise<ReplayResult>;
  return handler(mutation);
}
