import type { focusSessions } from "@/lib/db/schema";

export type FocusSessionRow = typeof focusSessions.$inferSelect;
export type FocusSessionStatus = FocusSessionRow["status"];

export const LIVE_STATUSES: FocusSessionStatus[] = ["running", "on_break", "paused"];

export const COUNTDOWN_MIN_MINUTES = 1;
export const COUNTDOWN_MAX_MINUTES = 240;
export const STOPWATCH_CAP_MINUTES = 120;
export const STOPWATCH_CAP_SECONDS = STOPWATCH_CAP_MINUTES * 60;
export const BREAK_INTERVAL_MIN_MINUTES = 20;
export const BREAK_INTERVAL_MAX_MINUTES = 60;
export const BREAK_DURATION_MIN_MINUTES = 0;
export const BREAK_DURATION_MAX_MINUTES = 10;

export type FocusStateView = {
  activeSeconds: number;
  remainingSeconds: number | null;
  capSeconds: number;
  overCap: boolean;
  dueForBreak: boolean;
  breakOver: boolean;
  /** Segundos restantes de la pausa activa en curso; `null` si no está en pausa. */
  breakRemainingSeconds: number | null;
};

export type FocusSessionPatch = Partial<
  Pick<
    FocusSessionRow,
    | "status"
    | "accumulatedActiveSeconds"
    | "lastResumedAt"
    | "breakStartedAt"
    | "breaksTakenCount"
    | "pausedAt"
    | "completedAt"
    | "autoCompleted"
  >
>;

function secondsBetween(fromIso: string, toMs: number): number {
  return Math.max(0, Math.floor((toMs - Date.parse(fromIso)) / 1000));
}

function addSeconds(iso: string, seconds: number): string {
  return new Date(Date.parse(iso) + Math.max(0, seconds) * 1000).toISOString();
}

function nextBreakThresholdSeconds(session: FocusSessionRow): number | null {
  if (!session.breaksEnabled || !session.breakIntervalMinutes) return null;
  return (session.breaksTakenCount + 1) * session.breakIntervalMinutes * 60;
}

/**
 * Cómputo puro (sin I/O) del estado derivado de una sesión en un instante `now`.
 * El servidor nunca guarda "tiempo transcurrido": esto se recalcula siempre a
 * partir de timestamps, para que una sesión "siga corriendo" aunque nadie haya
 * tenido la pestaña abierta mientras tanto.
 */
export function computeFocusState(session: FocusSessionRow, now: Date): FocusStateView {
  const nowMs = now.getTime();
  const activeSeconds =
    session.status === "running"
      ? session.accumulatedActiveSeconds + secondsBetween(session.lastResumedAt, nowMs)
      : session.accumulatedActiveSeconds;

  const capSeconds = session.mode === "countdown" ? session.plannedDurationSeconds ?? 0 : STOPWATCH_CAP_SECONDS;
  const overCap = activeSeconds >= capSeconds;
  const remainingSeconds = session.mode === "countdown" ? Math.max(0, capSeconds - activeSeconds) : null;

  // Un umbral de pausa solo es "debido" si cae antes del tope de la sesión —
  // si ya coincide con el tope o lo supera, gana el cierre por tope, no la
  // pausa. La comparación usa `activeSeconds` "ingenuo" (como si nunca hubiera
  // habido pausas) solo para detectar que el umbral ya quedó atrás; el valor
  // exacto en que ocurrió se reconstruye aparte en reconcileFocusSession.
  const threshold = nextBreakThresholdSeconds(session);
  const dueForBreak =
    session.status === "running" && threshold !== null && activeSeconds >= threshold && threshold < capSeconds;

  const breakOver =
    session.status === "on_break" &&
    session.breakStartedAt !== null &&
    session.breakDurationMinutes !== null &&
    secondsBetween(session.breakStartedAt, nowMs) >= session.breakDurationMinutes * 60;

  const breakRemainingSeconds =
    session.status === "on_break" && session.breakStartedAt !== null && session.breakDurationMinutes !== null
      ? Math.max(0, session.breakDurationMinutes * 60 - secondsBetween(session.breakStartedAt, nowMs))
      : null;

  return { activeSeconds, remainingSeconds, capSeconds, overCap, dueForBreak, breakOver, breakRemainingSeconds };
}

export type FocusReconciliation = { changed: boolean; session: FocusSessionRow };

const MAX_RECONCILE_STEPS = 1000;

/**
 * Recalcula el estado de una sesión contra `now`, aplicando en cadena todas las
 * transiciones que "debieron" haber ocurrido mientras nadie miraba (pausas
 * activas cruzadas, tope de tiempo alcanzado). Es un loop, no un solo `if`,
 * porque tras una ausencia larga pueden faltar varios saltos antes de llegar
 * al estado real. Termina siempre porque `overCap` es eventualmente cierto.
 */
export function reconcileFocusSession(row: FocusSessionRow, now: Date): FocusReconciliation {
  if (row.status === "completed" || row.status === "cancelled") {
    return { changed: false, session: row };
  }

  let session = row;
  let changed = false;

  for (let step = 0; step < MAX_RECONCILE_STEPS; step++) {
    const state = computeFocusState(session, now);

    // Las pausas pendientes se resuelven antes que el cierre por tope: un
    // umbral de pausa más cercano en el tiempo "ocurrió" antes que el tope,
    // aunque el cálculo ingenuo de `activeSeconds` (que asume que la sesión
    // corrió sin pausas) ya luzca por encima de ambos a la vez.
    if (session.status === "running" && state.dueForBreak) {
      const threshold = nextBreakThresholdSeconds(session)!;
      const isReminderOnly = (session.breakDurationMinutes ?? 0) === 0;
      session = isReminderOnly
        ? { ...session, breaksTakenCount: session.breaksTakenCount + 1 }
        : {
            ...session,
            status: "on_break",
            accumulatedActiveSeconds: threshold,
            breakStartedAt: addSeconds(session.lastResumedAt, threshold - session.accumulatedActiveSeconds),
            breaksTakenCount: session.breaksTakenCount + 1,
          };
      changed = true;
      continue;
    }

    if (state.overCap) {
      const completedAt =
        session.status === "running"
          ? addSeconds(session.lastResumedAt, state.capSeconds - session.accumulatedActiveSeconds)
          : now.toISOString();
      session = {
        ...session,
        status: "completed",
        accumulatedActiveSeconds: state.capSeconds,
        completedAt,
        autoCompleted: true,
      };
      changed = true;
      break;
    }

    if (session.status === "on_break" && state.breakOver) {
      session = {
        ...session,
        status: "running",
        lastResumedAt: addSeconds(session.breakStartedAt!, (session.breakDurationMinutes ?? 0) * 60),
        breakStartedAt: null,
      };
      changed = true;
      continue;
    }

    break;
  }

  return { changed, session };
}

export function applyPause(session: FocusSessionRow, now: Date): FocusSessionPatch {
  return {
    status: "paused",
    accumulatedActiveSeconds: computeFocusState(session, now).activeSeconds,
    pausedAt: now.toISOString(),
  };
}

export function applyResume(now: Date): FocusSessionPatch {
  return { status: "running", lastResumedAt: now.toISOString(), pausedAt: null };
}

export function applyEndBreakEarly(now: Date): FocusSessionPatch {
  return { status: "running", lastResumedAt: now.toISOString(), breakStartedAt: null };
}

export function applyFinalize(
  session: FocusSessionRow,
  now: Date,
  outcome: "completed" | "cancelled"
): FocusSessionPatch {
  const state = computeFocusState(session, now);
  return {
    status: outcome,
    accumulatedActiveSeconds: Math.min(state.activeSeconds, state.capSeconds),
    completedAt: now.toISOString(),
    autoCompleted: false,
  };
}
