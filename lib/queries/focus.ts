import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { focusRewardTiers, focusSessions, focusSettings } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { LIVE_STATUSES, computeFocusState, reconcileFocusSession, type FocusSessionRow } from "@/lib/focus/compute";
import { computeNewRewardTiers, type FocusRewardTier } from "@/lib/focus/rewards";

export type { FocusSessionRow };
export type FocusSettingsRow = typeof focusSettings.$inferSelect;

const DEFAULT_FOCUS_SETTINGS: Omit<FocusSettingsRow, "userId"> = {
  dailyGoalMinutes: 60,
  defaultMode: "countdown",
  defaultDurationMinutes: 25,
  breaksEnabled: false,
  breakIntervalMinutes: 25,
  breakDurationMinutes: 5,
  soundEnabled: true,
};

async function getFocusRewardLifetimeTotals(userId: string): Promise<{ totalSeconds: number; count: number }> {
  const [row] = await db
    .select({
      totalSeconds: sql<number>`coalesce(sum(${focusSessions.accumulatedActiveSeconds}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, userId), eq(focusSessions.status, "completed")));
  return { totalSeconds: Number(row?.totalSeconds ?? 0), count: Number(row?.count ?? 0) };
}

/**
 * Revisa y desbloquea tiers de recompensa nuevos. Se llama solo justo
 * después de que una sesión pasa a "completed" (nunca "cancelled" — esas no
 * cuentan), desde los dos caminos que pueden dejarla así: la reconciliación
 * automática (`reconcileAndPersist` acá abajo) y el botón manual "Terminar"
 * (`transition()` en `lib/actions/focus.ts`).
 */
export async function checkAndUnlockFocusRewards(userId: string): Promise<FocusRewardTier[]> {
  const [{ totalSeconds, count }, unlockedRows] = await Promise.all([
    getFocusRewardLifetimeTotals(userId),
    db.select({ tier: focusRewardTiers.tier }).from(focusRewardTiers).where(eq(focusRewardTiers.userId, userId)),
  ]);

  const newTiers = computeNewRewardTiers({
    totalCompletedFocusSeconds: totalSeconds,
    completedSessionCount: count,
    alreadyUnlockedTiers: new Set(unlockedRows.map((r) => r.tier as FocusRewardTier)),
  });

  if (newTiers.length > 0) {
    await db.insert(focusRewardTiers).values(newTiers.map((tier) => ({ id: nanoid(), userId, tier })));
  }
  return newTiers;
}

/** Persiste el resultado de reconciliar contra `now`, si hubo cambios, y devuelve la fila ya al día
 * junto con cualquier recompensa recién desbloqueada por esa reconciliación. */
export async function reconcileAndPersist(
  row: FocusSessionRow,
  now: Date
): Promise<{ session: FocusSessionRow; unlockedTiers: FocusRewardTier[] }> {
  const { changed, session } = reconcileFocusSession(row, now);
  if (!changed) return { session, unlockedTiers: [] };

  await db
    .update(focusSessions)
    .set({
      status: session.status,
      accumulatedActiveSeconds: session.accumulatedActiveSeconds,
      lastResumedAt: session.lastResumedAt,
      breakStartedAt: session.breakStartedAt,
      breaksTakenCount: session.breaksTakenCount,
      pausedAt: session.pausedAt,
      completedAt: session.completedAt,
      autoCompleted: session.autoCompleted,
    })
    .where(eq(focusSessions.id, session.id));

  const unlockedTiers = session.status === "completed" ? await checkAndUnlockFocusRewards(session.userId) : [];
  return { session, unlockedTiers };
}

/**
 * Único punto de entrada para leer "la sesión activa" del usuario junto con
 * cualquier recompensa que se haya desbloqueado en esta misma llamada: si
 * existe, la reconcilia contra el instante actual antes de devolverla, así
 * que puede volver ya con status "completed" si el tope o una pausa activa
 * se venció mientras nadie miraba. Este es el chokepoint que hace que el
 * enfoque "siga corriendo" aunque el navegador haya estado cerrado.
 */
export async function getActiveFocusSessionWithRewards(): Promise<{
  session: FocusSessionRow;
  unlockedTiers: FocusRewardTier[];
} | null> {
  const userId = await getCurrentUserId();
  const [row] = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, userId), inArray(focusSessions.status, LIVE_STATUSES)))
    .limit(1);
  if (!row) return null;
  return reconcileAndPersist(row, new Date());
}

export async function getActiveFocusSession(): Promise<FocusSessionRow | null> {
  const result = await getActiveFocusSessionWithRewards();
  return result?.session ?? null;
}

/**
 * Datos mínimos que necesita cualquier pantalla para mostrar el estado de
 * enfoque en curso — vía `FocusHeaderChip` (header) o `MiniFocusIndicator`
 * (flotante). Único punto de lectura para ambos en vez de repetir el mismo
 * `Promise.all([getActiveFocusSession(), getFocusSettings()])` en cada
 * layout/página que lo necesita.
 */
export type FocusHeaderData = { session: FocusSessionRow | null; soundEnabled: boolean };

export async function getFocusHeaderData(): Promise<FocusHeaderData> {
  const [session, settings] = await Promise.all([getActiveFocusSession(), getFocusSettings()]);
  return { session, soundEnabled: settings.soundEnabled };
}

export async function getFocusSettings(): Promise<FocusSettingsRow> {
  const userId = await getCurrentUserId();
  const [row] = await db.select().from(focusSettings).where(eq(focusSettings.userId, userId)).limit(1);
  return row ?? { userId, ...DEFAULT_FOCUS_SETTINGS };
}

export async function getFocusHistory(params: {
  habitId?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<FocusSessionRow[]> {
  const { habitId, categoryId, limit = 30, offset = 0 } = params;
  const userId = await getCurrentUserId();
  const conditions = [eq(focusSessions.userId, userId), inArray(focusSessions.status, ["completed", "cancelled"])];
  if (habitId) conditions.push(eq(focusSessions.habitId, habitId));
  if (categoryId) conditions.push(eq(focusSessions.categoryId, categoryId));
  return db
    .select()
    .from(focusSessions)
    .where(and(...conditions))
    .orderBy(desc(focusSessions.startedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Progreso del objetivo diario. Recibe la sesión activa ya resuelta por el
 * caller (en vez de releerla) porque `/focus` ya la obtuvo vía
 * `getActiveFocusSession()` para decidir qué UI mostrar — evitar una segunda
 * consulta+reconciliación del mismo row. Si esa sesión pertenece al día
 * consultado, su tiempo activo en curso (calculado en el momento, no
 * persistido) se suma al total ya completado, para que el objetivo de hoy
 * avance en vivo mientras la sesión sigue corriendo.
 */
export async function getTodayFocusProgress(
  date: string,
  activeSession: FocusSessionRow | null
): Promise<{ completedSeconds: number; goalMinutes: number }> {
  const userId = await getCurrentUserId();
  const [rows, settings] = await Promise.all([
    db
      .select({ accumulatedActiveSeconds: focusSessions.accumulatedActiveSeconds })
      .from(focusSessions)
      .where(
        and(eq(focusSessions.userId, userId), eq(focusSessions.date, date), eq(focusSessions.status, "completed"))
      ),
    getFocusSettings(),
  ]);
  const completedSeconds = rows.reduce((sum, r) => sum + r.accumulatedActiveSeconds, 0);
  const liveSeconds =
    activeSession && activeSession.date === date && LIVE_STATUSES.includes(activeSession.status)
      ? computeFocusState(activeSession, new Date()).activeSeconds
      : 0;
  return { completedSeconds: completedSeconds + liveSeconds, goalMinutes: settings.dailyGoalMinutes };
}

export type FocusRewardProgress = {
  totalCompletedSeconds: number;
  completedSessionCount: number;
  unlockedTiers: FocusRewardTier[];
};

/** Para la pantalla /focus/forest: totales de por vida + qué tiers ya se desbloquearon. */
export async function getFocusRewardProgress(): Promise<FocusRewardProgress> {
  const userId = await getCurrentUserId();
  const [{ totalSeconds, count }, unlockedRows] = await Promise.all([
    getFocusRewardLifetimeTotals(userId),
    db.select({ tier: focusRewardTiers.tier }).from(focusRewardTiers).where(eq(focusRewardTiers.userId, userId)),
  ]);
  return {
    totalCompletedSeconds: totalSeconds,
    completedSessionCount: count,
    unlockedTiers: unlockedRows.map((r) => r.tier as FocusRewardTier),
  };
}
