import type { QueuedRecord } from "@/lib/offline/db";
import type { HabitFormValues } from "@/lib/validation/habit";
import type { RoutineFormValues } from "@/lib/validation/routine";
import type { HabitWithExtras, CategoryRow } from "@/lib/queries/habits";
import type { RoutineWithStats, RoutineHabitSummary } from "@/lib/queries/routines";
import { buildFrequencyConfig } from "@/lib/habits/frequency";
import { FREEZE_MONTHLY_ALLOWANCE } from "@/lib/habits/status";

// --- Habits ---

export function pendingHabitCreates(queue: QueuedRecord[]) {
  return queue.filter((m): m is Extract<QueuedRecord, { type: "createHabit" }> => m.type === "createHabit");
}

export function pendingHabitUpdates(queue: QueuedRecord[]): Map<string, HabitFormValues> {
  return new Map(
    queue
      .filter((m): m is Extract<QueuedRecord, { type: "updateHabit" }> => m.type === "updateHabit")
      .map((m) => [m.habitId, m.values])
  );
}

export function pendingHabitArchiveIds(queue: QueuedRecord[]): Set<string> {
  return new Set(
    queue
      .filter((m): m is Extract<QueuedRecord, { type: "archiveHabit" }> => m.type === "archiveHabit")
      .map((m) => m.habitId)
  );
}

export function pendingHabitRestoreIds(queue: QueuedRecord[]): Set<string> {
  return new Set(
    queue
      .filter((m): m is Extract<QueuedRecord, { type: "restoreHabit" }> => m.type === "restoreHabit")
      .map((m) => m.habitId)
  );
}

/** Editable habit fields derived from the form values — reused by the creation ghost and the edit overlay. */
function habitEditableFields(values: HabitFormValues, categories: CategoryRow[]) {
  return {
    categoryId: values.categoryId || null,
    name: values.name,
    description: values.description || null,
    goalType: values.goalType,
    goalTarget: values.goalType === "binary" ? null : values.goalTarget ?? null,
    goalUnit: values.goalType === "binary" ? null : values.goalUnit || null,
    frequencyType: values.frequencyType,
    frequencyConfig: JSON.stringify(buildFrequencyConfig(values)),
    reminders: values.reminderTime ? JSON.stringify([values.reminderTime]) : null,
    hardMode: values.hardMode ?? false,
    skipDaysAllowed: values.skipDaysAllowed ?? 0,
    startDate: values.startDate,
    isPinned: values.isPinned ?? false,
    category: values.categoryId ? categories.find((c) => c.id === values.categoryId) ?? null : null,
  };
}

/** Builds a "good enough" `HabitWithExtras` to display a habit created offline that hasn't synced yet. */
export function buildGhostHabit(
  id: string,
  values: HabitFormValues,
  categories: CategoryRow[]
): HabitWithExtras {
  return {
    id,
    userId: "",
    icon: null,
    color: null,
    endDate: null,
    status: "active",
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    todayLog: null,
    streak: { current: 0, longest: 0, freezesAvailable: FREEZE_MONTHLY_ALLOWANCE },
    ...habitEditableFields(values, categories),
  };
}

/** Overlays an offline edit not yet synced on top of the already-loaded real habit. */
export function applyPendingHabitEdit(
  habit: HabitWithExtras,
  values: HabitFormValues,
  categories: CategoryRow[]
): HabitWithExtras {
  return { ...habit, ...habitEditableFields(values, categories) };
}

// --- Categories ---

export function pendingCategoryHiddenOverrides(queue: QueuedRecord[]): Map<string, boolean> {
  return new Map(
    queue
      .filter((m): m is Extract<QueuedRecord, { type: "setCategoryHidden" }> => m.type === "setCategoryHidden")
      .map((m) => [m.categoryId, m.hidden])
  );
}

// --- Routines ---

export function pendingRoutineCreates(queue: QueuedRecord[]) {
  return queue.filter(
    (m): m is Extract<QueuedRecord, { type: "createRoutine" }> => m.type === "createRoutine"
  );
}

export function pendingRoutineUpdates(queue: QueuedRecord[]): Map<string, RoutineFormValues> {
  return new Map(
    queue
      .filter((m): m is Extract<QueuedRecord, { type: "updateRoutine" }> => m.type === "updateRoutine")
      .map((m) => [m.routineId, m.values])
  );
}

export function pendingRoutineDeleteIds(queue: QueuedRecord[]): Set<string> {
  return new Set(
    queue
      .filter((m): m is Extract<QueuedRecord, { type: "deleteRoutine" }> => m.type === "deleteRoutine")
      .map((m) => m.routineId)
  );
}

/**
 * Editable routine fields derived from the form values — reused by the creation ghost and
 * the edit overlay. `goalType`/`goalTarget` for each habit are a placeholder (only used to
 * list names, not for the quick "mark all" tap).
 */
function routineEditableFields(values: RoutineFormValues, habitNames: { id: string; name: string }[]) {
  const habitById = new Map(habitNames.map((h) => [h.id, h]));
  const habits: RoutineHabitSummary[] = values.habitIds
    .map((hid) => habitById.get(hid))
    .filter((h): h is { id: string; name: string } => !!h)
    .map((h) => ({ id: h.id, name: h.name, goalType: "binary" as const, goalTarget: null }));

  return { name: values.name, habitIds: values.habitIds, habits };
}

export function buildGhostRoutine(
  id: string,
  values: RoutineFormValues,
  habitNames: { id: string; name: string }[]
): RoutineWithStats {
  return {
    id,
    userId: "",
    sortOrder: 0,
    completionPct30: 0,
    ...routineEditableFields(values, habitNames),
  };
}

/** Overlays an offline edit not yet synced on top of the already-loaded real routine. */
export function applyPendingRoutineEdit(
  routine: RoutineWithStats,
  values: RoutineFormValues,
  habitNames: { id: string; name: string }[]
): RoutineWithStats {
  return { ...routine, ...routineEditableFields(values, habitNames) };
}
