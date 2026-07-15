import type { QueuedRecord } from "@/lib/offline/db";
import type { HabitFormValues } from "@/lib/validation/habit";
import type { RoutineFormValues } from "@/lib/validation/routine";
import type { TaskFormValues } from "@/lib/validation/task";
import type { TransactionFormValues } from "@/lib/validation/transaction";
import type { StartFocusSessionValues } from "@/lib/validation/focus";
import type { GymSessionFormValues } from "@/lib/validation/gym";
import type { HabitWithExtras, CategoryRow } from "@/lib/queries/habits";
import type { RoutineWithStats, RoutineHabitSummary } from "@/lib/queries/routines";
import type { TaskWithStatus } from "@/lib/queries/tasks";
import type { FinanceCategoryRow, TransactionWithCategory } from "@/lib/queries/finance";
import type { GymSessionRow } from "@/lib/queries/gym";
import { buildFrequencyConfig } from "@/lib/habits/frequency";
import { FREEZE_MONTHLY_ALLOWANCE } from "@/lib/habits/status";
import { buildTaskRecurrenceConfig, currentPeriodKey } from "@/lib/tasks/recurrence";
import {
  applyEndBreakEarly,
  applyPause as applyFocusPause,
  applyResume as applyFocusResume,
  resolveStartFocusValues,
  type FocusSessionRow,
} from "@/lib/focus/compute";
import { applyPause, applyResume, type TimerRow } from "@/lib/metronome/timer-compute";

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

// --- Tasks ---

export function pendingTaskCreates(queue: QueuedRecord[]) {
  return queue.filter((m): m is Extract<QueuedRecord, { type: "createTask" }> => m.type === "createTask");
}

export function pendingTaskUpdates(queue: QueuedRecord[]): Map<string, TaskFormValues> {
  return new Map(
    queue
      .filter((m): m is Extract<QueuedRecord, { type: "updateTask" }> => m.type === "updateTask")
      .map((m) => [m.taskId, m.values])
  );
}

export function pendingTaskDeleteIds(queue: QueuedRecord[]): Set<string> {
  return new Set(
    queue.filter((m): m is Extract<QueuedRecord, { type: "deleteTask" }> => m.type === "deleteTask").map((m) => m.taskId)
  );
}

/** Editable task fields derived from the form values — reused by the creation ghost and the edit overlay. */
function taskEditableFields(values: TaskFormValues) {
  return {
    title: values.title,
    recurrenceType: values.recurrenceType,
    recurrenceConfig: JSON.stringify(buildTaskRecurrenceConfig(values)),
  };
}

/** Builds a "good enough" `TaskWithStatus` to display a task created offline
 * that hasn't synced yet — always shown as not done for its own (freshly
 * computed) current period, since it can't have any completion yet. */
export function buildGhostTask(id: string, values: TaskFormValues, today: string): TaskWithStatus {
  const { recurrenceType, recurrenceConfig } = taskEditableFields(values);
  return {
    id,
    userId: "",
    title: values.title,
    recurrenceType,
    recurrenceConfig,
    startDate: today,
    createdAt: new Date().toISOString(),
    isDone: false,
    periodKey: currentPeriodKey({ recurrenceType, recurrenceConfig, startDate: today }, today),
  };
}

/** Overlays an offline edit not yet synced on top of the already-loaded real task.
 * Leaves `isDone`/`periodKey` as already computed for the real row — an unsynced
 * recurrence change shouldn't retroactively reinterpret today's completion state. */
export function applyPendingTaskEdit(task: TaskWithStatus, values: TaskFormValues): TaskWithStatus {
  return { ...task, ...taskEditableFields(values) };
}

// --- Transactions ---

export function pendingTransactionCreates(queue: QueuedRecord[]) {
  return queue.filter(
    (m): m is Extract<QueuedRecord, { type: "createTransaction" }> => m.type === "createTransaction"
  );
}

export function pendingTransactionUpdates(queue: QueuedRecord[]): Map<string, TransactionFormValues> {
  return new Map(
    queue
      .filter((m): m is Extract<QueuedRecord, { type: "updateTransaction" }> => m.type === "updateTransaction")
      .map((m) => [m.transactionId, m.values])
  );
}

export function pendingTransactionDeleteIds(queue: QueuedRecord[]): Set<string> {
  return new Set(
    queue
      .filter((m): m is Extract<QueuedRecord, { type: "deleteTransaction" }> => m.type === "deleteTransaction")
      .map((m) => m.transactionId)
  );
}

/** Editable transaction fields derived from the form values — reused by the creation ghost and the edit overlay. */
function transactionEditableFields(values: TransactionFormValues, categories: FinanceCategoryRow[]) {
  const categoryId = values.type === "expense" ? (values.categoryId ?? null) : null;
  return {
    type: values.type,
    categoryId,
    amount: values.amount,
    note: values.note || null,
    date: values.date,
    category: categoryId ? (categories.find((c) => c.id === categoryId) ?? null) : null,
  };
}

/** Builds a "good enough" `TransactionWithCategory` to display a transaction
 * created offline that hasn't synced yet. */
export function buildGhostTransaction(
  id: string,
  values: TransactionFormValues,
  categories: FinanceCategoryRow[]
): TransactionWithCategory {
  return {
    id,
    createdAt: new Date().toISOString(),
    // A transaction created offline through this app's own form is, by
    // definition, never one a recurring rule auto-generated server-side.
    recurringTransactionId: null,
    ...transactionEditableFields(values, categories),
  };
}

/** Overlays an offline edit not yet synced on top of the already-loaded real transaction. */
export function applyPendingTransactionEdit(
  transaction: TransactionWithCategory,
  values: TransactionFormValues,
  categories: FinanceCategoryRow[]
): TransactionWithCategory {
  return { ...transaction, ...transactionEditableFields(values, categories) };
}

// --- Focus ---

/** Builds a "good enough" `FocusSessionRow` to display a session started
 * offline that hasn't synced yet. `habitId`/`categoryId` are used as-is
 * from the form (no server-side habit→category resolution possible
 * offline) — self-corrects once the real sync happens. `at` is the real
 * moment the "start" mutation was queued, not render time — see
 * `applyFocusMutation` below for why that distinction matters. */
export function buildGhostFocusSession(
  id: string,
  values: StartFocusSessionValues,
  today: string,
  at: Date = new Date()
): FocusSessionRow {
  const resolved = resolveStartFocusValues(values);
  const atIso = at.toISOString();
  return {
    id,
    userId: "",
    habitId: values.habitId || null,
    categoryId: values.categoryId || null,
    mode: resolved.mode,
    plannedDurationSeconds: resolved.plannedDurationSeconds,
    status: "running",
    startedAt: atIso,
    lastResumedAt: atIso,
    accumulatedActiveSeconds: 0,
    breaksEnabled: resolved.breaksEnabled,
    breakIntervalMinutes: resolved.breaksEnabled ? resolved.breakIntervalMinutes : null,
    breakDurationMinutes: resolved.breaksEnabled ? resolved.breakDurationMinutes : null,
    breaksTakenCount: 0,
    breakStartedAt: null,
    pausedAt: null,
    completedAt: null,
    autoCompleted: false,
    date: today,
    createdAt: atIso,
  };
}

const FOCUS_MUTATION_TYPES: ReadonlySet<QueuedRecord["type"]> = new Set([
  "startFocusSession",
  "pauseFocusSession",
  "resumeFocusSession",
  "endBreakEarly",
  "finishFocusSession",
  "cancelFocusSession",
]);

/**
 * Folds every queued focus mutation, in order, into a single "ghost"
 * session preview — reusing the same pure transition functions the server
 * applies (lib/focus/compute.ts), so the offline preview and the eventual
 * synced result agree. Returns `undefined` when there's no pending focus
 * mutation at all (the caller should trust the real server session), or
 * `null` once a finish/cancel closes the session (no longer active).
 *
 * Each step is anchored to *that mutation's own* `createdAt` (set once, at
 * `enqueueMutation` time — see lib/offline/db.ts), not to the current
 * wall-clock time: this fold re-runs on every render once per queued
 * mutation (see this function's `useMemo` callers), and a shared "now"
 * would silently push `startedAt`/`lastResumedAt` forward on every re-fold
 * — e.g. a session started 5 minutes ago would be reconstructed as if it
 * had just started the moment a later "pause" gets queued, losing those 5
 * elapsed minutes. Per-mutation timestamps make the fold idempotent
 * regardless of how many times or when it re-runs (same fix already
 * applied to the metronome timer's ghost fold, see
 * applyMetronomeTimerMutation below).
 */
function applyFocusMutation(session: FocusSessionRow | null, mutation: QueuedRecord, today: string): FocusSessionRow | null {
  const at = new Date(mutation.createdAt);
  switch (mutation.type) {
    case "startFocusSession":
      return buildGhostFocusSession(mutation.id, mutation.values, today, at);
    case "pauseFocusSession":
      return session ? { ...session, ...applyFocusPause(session, at) } : session;
    case "resumeFocusSession":
      return session ? { ...session, ...applyFocusResume(at) } : session;
    case "endBreakEarly":
      return session ? { ...session, ...applyEndBreakEarly(at) } : session;
    case "finishFocusSession":
    case "cancelFocusSession":
      return null;
    default:
      return session;
  }
}

export function pendingFocusSession(queue: QueuedRecord[], today: string): FocusSessionRow | null | undefined {
  const focusMutations = queue.filter((m) => FOCUS_MUTATION_TYPES.has(m.type));
  if (focusMutations.length === 0) return undefined;

  return focusMutations.reduce<FocusSessionRow | null>(
    (session, mutation) => applyFocusMutation(session, mutation, today),
    null
  );
}

// --- Gym sessions ---

export function pendingGymSessionCreates(queue: QueuedRecord[]) {
  return queue.filter(
    (m): m is Extract<QueuedRecord, { type: "createGymSession" }> => m.type === "createGymSession"
  );
}

export function pendingGymSessionUpdates(queue: QueuedRecord[]): Map<string, GymSessionFormValues> {
  return new Map(
    queue
      .filter((m): m is Extract<QueuedRecord, { type: "updateGymSession" }> => m.type === "updateGymSession")
      .map((m) => [m.sessionId, m.values])
  );
}

export function pendingGymSessionDeleteIds(queue: QueuedRecord[]): Set<string> {
  return new Set(
    queue
      .filter((m): m is Extract<QueuedRecord, { type: "deleteGymSession" }> => m.type === "deleteGymSession")
      .map((m) => m.sessionId)
  );
}

/** Editable gym session fields derived from the form values — reused by the creation ghost and the edit overlay. */
function gymSessionEditableFields(values: GymSessionFormValues) {
  return { date: values.date, exercises: values.exercises };
}

/** Builds a "good enough" `GymSessionRow` to display a session logged
 * offline that hasn't synced yet. */
export function buildGhostGymSession(id: string, values: GymSessionFormValues): GymSessionRow {
  return {
    id,
    userId: "",
    createdAt: new Date().toISOString(),
    ...gymSessionEditableFields(values),
  };
}

/** Overlays an offline edit not yet synced on top of the already-loaded real session. */
export function applyPendingGymSessionEdit(session: GymSessionRow, values: GymSessionFormValues): GymSessionRow {
  return { ...session, ...gymSessionEditableFields(values) };
}

// --- Metronome timer ---

/** Builds a "good enough" `TimerRow` to display a countdown started offline
 * that hasn't synced yet. `at` is the real moment the "start" mutation was
 * queued, not render time — see `applyMetronomeTimerMutation` below for why
 * that distinction matters. */
export function buildGhostTimer(durationSeconds: number, at: Date = new Date()): TimerRow {
  const atIso = at.toISOString();
  return { status: "running", durationSeconds, startedAt: atIso, lastResumedAt: atIso, accumulatedActiveSeconds: 0 };
}

const METRONOME_TIMER_MUTATION_TYPES: ReadonlySet<QueuedRecord["type"]> = new Set([
  "startMetronomeTimer",
  "pauseMetronomeTimer",
  "resumeMetronomeTimer",
  "cancelMetronomeTimer",
]);

/**
 * Folds every queued timer mutation, in order, into a single "ghost"
 * preview — reusing the exact pure transitions the server applies
 * (lib/metronome/timer-compute.ts), so the offline preview and the eventual
 * synced result agree. Each step is anchored to *that mutation's own*
 * `createdAt` (set once, at `enqueueMutation` time — see lib/offline/db.ts),
 * not to the current wall-clock time: this fold re-runs on every render
 * once per queued mutation (see `pendingMetronomeTimer`'s `useMemo` caller),
 * and a shared "now" would silently push `startedAt`/`lastResumedAt`
 * forward on every re-fold — e.g. a "start" 10s ago would be folded again
 * when a later "pause" is queued and be reconstructed as if it had just
 * started, losing the 10 elapsed seconds. Per-mutation timestamps make the
 * fold idempotent regardless of how many times or when it re-runs.
 */
function applyMetronomeTimerMutation(timer: TimerRow | null, mutation: QueuedRecord): TimerRow | null {
  const at = new Date(mutation.createdAt);
  switch (mutation.type) {
    case "startMetronomeTimer":
      return buildGhostTimer(mutation.durationSeconds, at);
    case "pauseMetronomeTimer":
      return timer ? { ...timer, ...applyPause(timer, at) } : timer;
    case "resumeMetronomeTimer":
      return timer ? { ...timer, ...applyResume(at) } : timer;
    case "cancelMetronomeTimer":
      return null;
    default:
      return timer;
  }
}

export function pendingMetronomeTimer(queue: QueuedRecord[]): TimerRow | null | undefined {
  const timerMutations = queue.filter((m) => METRONOME_TIMER_MUTATION_TYPES.has(m.type));
  if (timerMutations.length === 0) return undefined;

  return timerMutations.reduce<TimerRow | null>(applyMetronomeTimerMutation, null);
}

// --- Sync panel (Settings) ---

export type PendingDomain = "habits" | "routines" | "tasks" | "finance" | "categories" | "focus" | "gym" | "metronome";

/** One entry per QueuedMutation variant (lib/offline/db.ts) — a `Record` over
 * the full union, same exhaustiveness trick as replay-registry.ts's
 * `Registry`: adding a new mutation type without extending this map is a
 * compile error, so the sync panel's breakdown can't silently go stale. */
const DOMAIN_BY_MUTATION_TYPE: Record<QueuedRecord["type"], PendingDomain> = {
  log: "habits",
  delete: "habits",
  freeze: "habits",
  createHabit: "habits",
  updateHabit: "habits",
  archiveHabit: "habits",
  restoreHabit: "habits",
  togglePinHabit: "habits",
  reorderHabits: "habits",
  setCategoryHidden: "categories",
  createRoutine: "routines",
  updateRoutine: "routines",
  deleteRoutine: "routines",
  createTask: "tasks",
  updateTask: "tasks",
  deleteTask: "tasks",
  toggleTask: "tasks",
  createTransaction: "finance",
  updateTransaction: "finance",
  deleteTransaction: "finance",
  startFocusSession: "focus",
  pauseFocusSession: "focus",
  resumeFocusSession: "focus",
  endBreakEarly: "focus",
  finishFocusSession: "focus",
  cancelFocusSession: "focus",
  createGymSession: "gym",
  updateGymSession: "gym",
  deleteGymSession: "gym",
  startMetronomeTimer: "metronome",
  pauseMetronomeTimer: "metronome",
  resumeMetronomeTimer: "metronome",
  cancelMetronomeTimer: "metronome",
};

export function pendingMutationsByDomain(queue: QueuedRecord[]): Record<PendingDomain, number> {
  const counts: Record<PendingDomain, number> = {
    habits: 0,
    routines: 0,
    tasks: 0,
    finance: 0,
    categories: 0,
    focus: 0,
    gym: 0,
    metronome: 0,
  };
  for (const mutation of queue) counts[DOMAIN_BY_MUTATION_TYPE[mutation.type]]++;
  return counts;
}
