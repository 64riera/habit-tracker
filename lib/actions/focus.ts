"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { focusSessions, focusSettings, habits } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { getTodayDateString } from "@/lib/date";
import { checkAndUnlockFocusRewards, getActiveFocusSession, getActiveFocusSessionWithRewards } from "@/lib/queries/focus";
import {
  applyEndBreakEarly,
  applyFinalize,
  applyPause,
  applyResume,
  LIVE_STATUSES,
  type FocusSessionPatch,
  type FocusSessionRow,
  type FocusSessionStatus,
} from "@/lib/focus/compute";
import type { FocusRewardTier } from "@/lib/focus/rewards";
import {
  extractStartFocusSessionFields,
  focusSettingsSchema,
  startFocusSessionSchema,
  type StartFocusSessionValues,
} from "@/lib/validation/focus";

/** Invalida todo el layout de (dashboard), no solo "/enfoque" — el indicador
 * flotante de sesión activa vive en el layout compartido, así que una
 * mutación de enfoque hecha estando en /enfoque debe reflejarse también en
 * cualquier otra ruta a la que el usuario navegue después. */
function revalidateFocusPaths() {
  revalidatePath("/", "layout");
}

async function resolveHabitId(userId: string, habitId: string | undefined | null): Promise<string | null> {
  if (!habitId) return null;
  const [habit] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1);
  return habit?.id ?? null;
}

export async function startFocusSession(input: StartFocusSessionValues): Promise<FocusSessionRow> {
  const values = startFocusSessionSchema.parse(input);
  const userId = await getCurrentUserId();

  // Reconcilia primero: si la sesión "activa" ya venció por tope o pausa
  // vencida, no debe bloquear el inicio de una nueva.
  const existing = await getActiveFocusSession();
  if (existing && LIVE_STATUSES.includes(existing.status)) return existing;

  const now = new Date();
  const nowIso = now.toISOString();
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour, now);
  const habitId = await resolveHabitId(userId, values.habitId);

  const breaksEnabled = Boolean(values.breaksEnabled);
  const breakIntervalMinutes = breaksEnabled ? values.breakIntervalMinutes ?? 25 : 25;
  const breakDurationMinutes = breaksEnabled ? values.breakDurationMinutes ?? 5 : 5;
  const durationMinutes = values.mode === "countdown" ? values.durationMinutes ?? 25 : 25;
  const plannedDurationSeconds = values.mode === "countdown" ? Math.round(durationMinutes * 60) : null;

  const id = nanoid();

  await db.batch([
    db.insert(focusSessions).values({
      id,
      userId,
      habitId,
      mode: values.mode,
      plannedDurationSeconds,
      status: "running",
      startedAt: nowIso,
      lastResumedAt: nowIso,
      accumulatedActiveSeconds: 0,
      breaksEnabled,
      breakIntervalMinutes: breaksEnabled ? breakIntervalMinutes : null,
      breakDurationMinutes: breaksEnabled ? breakDurationMinutes : null,
      date: today,
    }),
    // Lo que se acaba de elegir queda como default recordado para la próxima vez.
    db
      .insert(focusSettings)
      .values({ userId, defaultMode: values.mode, defaultDurationMinutes: durationMinutes, breaksEnabled, breakIntervalMinutes, breakDurationMinutes })
      .onConflictDoUpdate({
        target: focusSettings.userId,
        set: { defaultMode: values.mode, defaultDurationMinutes: durationMinutes, breaksEnabled, breakIntervalMinutes, breakDurationMinutes },
      }),
  ]);

  revalidateFocusPaths();
  const [created] = await db.select().from(focusSessions).where(eq(focusSessions.id, id)).limit(1);
  return created;
}

/** Guarda el objetivo diario de enfoque (en minutos) como preferencia recordada del usuario. */
export async function setFocusDailyGoal(minutes: number): Promise<void> {
  const { dailyGoalMinutes } = focusSettingsSchema.parse({ dailyGoalMinutes: minutes });
  const userId = await getCurrentUserId();
  await db
    .insert(focusSettings)
    .values({ userId, dailyGoalMinutes })
    .onConflictDoUpdate({ target: focusSettings.userId, set: { dailyGoalMinutes } });
  revalidateFocusPaths();
}

/** Activa/desactiva el sonido + flash de título al terminar una sesión o entrar a una pausa activa. */
export async function setFocusSoundEnabled(enabled: boolean): Promise<void> {
  const userId = await getCurrentUserId();
  await db
    .insert(focusSettings)
    .values({ userId, soundEnabled: enabled })
    .onConflictDoUpdate({ target: focusSettings.userId, set: { soundEnabled: enabled } });
  revalidateFocusPaths();
}

export type StartFocusSessionFormState = { error?: string };

/** Wrapper apto para `useActionState`/`<form action>`: valida el FormData del formulario de inicio y delega en startFocusSession. */
export async function startFocusSessionForm(
  _prevState: StartFocusSessionFormState,
  formData: FormData
): Promise<StartFocusSessionFormState> {
  const parsed = startFocusSessionSchema.safeParse(extractStartFocusSessionFields(formData));
  if (!parsed.success) return { error: "invalid" };
  await startFocusSession(parsed.data);
  return {};
}

export type ActiveFocusSessionResult = { session: FocusSessionRow | null; unlockedTiers: FocusRewardTier[] };

/**
 * RPC de solo lectura para el hook de ticking del cliente: relee la sesión
 * activa (ya reconciliada) sin forzar una invalidación de ruta — a
 * diferencia de las transiciones de abajo, este se llama con frecuencia
 * (cada vez que la pestaña vuelve a foco, o cuando el cliente detecta que
 * ya debió cruzarse un umbral) y no debería refrescar todo el árbol de
 * Server Components en cada llamada. Incluye `unlockedTiers` porque un
 * resync también puede ser el momento en que la reconciliación completa la
 * sesión (p. ej. el usuario mira la cuenta regresiva llegar a cero) — el
 * hook de ticking usa esto para disparar el toast de recompensa incluso sin
 * que el usuario haya tocado "Terminar".
 */
export async function getActiveFocusSessionAction(): Promise<ActiveFocusSessionResult> {
  const result = await getActiveFocusSessionWithRewards();
  return result ?? { session: null, unlockedTiers: [] };
}

/**
 * Reconcilia la sesión activa contra `now` y, si sigue en el estado esperado
 * tras eso, le aplica la transición pedida. Si la reconciliación ya la cerró
 * (tope alcanzado mientras el usuario no miraba), simplemente devuelve el
 * estado ya final en vez de aplicar el cambio — mismo camino de código para
 * el caso "en vivo" y el caso "reconciliado tras una ausencia larga".
 */
async function transition(
  allowedStatuses: FocusSessionStatus[],
  makePatch: (session: FocusSessionRow, now: Date) => FocusSessionPatch
): Promise<ActiveFocusSessionResult> {
  const session = await getActiveFocusSession();
  if (!session || !allowedStatuses.includes(session.status)) return { session, unlockedTiers: [] };

  const now = new Date();
  const patch = makePatch(session, now);
  await db.update(focusSessions).set(patch).where(eq(focusSessions.id, session.id));
  revalidateFocusPaths();

  const unlockedTiers = patch.status === "completed" ? await checkAndUnlockFocusRewards(session.userId) : [];
  return { session: { ...session, ...patch }, unlockedTiers };
}

export async function pauseFocusSession(): Promise<void> {
  await transition(["running"], (session, now) => applyPause(session, now));
}

export async function resumeFocusSession(): Promise<void> {
  await transition(["paused"], (_session, now) => applyResume(now));
}

export async function endBreakEarly(): Promise<void> {
  await transition(["on_break"], (_session, now) => applyEndBreakEarly(now));
}

/** A diferencia de las otras transiciones, esta sí devuelve algo (los tiers
 * recién desbloqueados): el botón "Terminar" lo usa vía `useTransition`, no
 * como `<form action>` plano, justamente para poder disparar el toast. */
export async function finishFocusSession(): Promise<{ unlockedTiers: FocusRewardTier[] }> {
  const { unlockedTiers } = await transition(["running", "on_break", "paused"], (session, now) =>
    applyFinalize(session, now, "completed")
  );
  return { unlockedTiers };
}

export async function cancelFocusSession(): Promise<void> {
  await transition(["running", "on_break", "paused"], (session, now) => applyFinalize(session, now, "cancelled"));
}
