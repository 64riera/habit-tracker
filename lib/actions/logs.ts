"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { achievements, habitLogs, habitStreaks, habits } from "@/lib/db/schema";
import { logSchema } from "@/lib/validation/habit";
import { computeStreak, type HabitRow, type LogStatusRow } from "@/lib/streaks/compute";
import { computeNewAchievements, type AchievementType } from "@/lib/achievements/compute";
import { getTodayDateString, monthKey } from "@/lib/date";
import { FREEZE_MONTHLY_ALLOWANCE } from "@/lib/habits/status";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { getCurrentUserId } from "@/lib/auth/session";

export type LogInput = {
  habitId: string;
  date: string;
  status: "done" | "partial" | "missed" | "justified" | "skipped" | "frozen";
  value?: number;
  note?: string;
  mood?: number;
};

/**
 * Cada acción de check-in sigue el mismo patrón: una lectura agrupada (1
 * round-trip a Turso vía db.batch), cómputo puro en memoria, y una escritura
 * agrupada (otro round-trip). Antes, cada paso (ownership, racha, logros)
 * hacía sus propias consultas secuenciales — hasta 10-12 round-trips por tap.
 */
async function loadHabitContext(userId: string, habitId: string) {
  // Todo en un solo round-trip: aunque deleteLog no necesita los logros
  // desbloqueados, agregarlos aquí no cuesta un viaje de red extra (van en el
  // mismo batch) y evita una segunda variante de esta función.
  const [[habit], logs, unlockedRows] = await db.batch([
    db.select().from(habits).where(eq(habits.id, habitId)).limit(1),
    db.select({ date: habitLogs.date, status: habitLogs.status }).from(habitLogs).where(eq(habitLogs.habitId, habitId)),
    db
      .select({ type: achievements.type })
      .from(achievements)
      .where(and(eq(achievements.userId, userId), eq(achievements.habitId, habitId))),
  ]);
  if (!habit || habit.userId !== userId) return null;
  return { habit, logs, alreadyUnlockedTypes: new Set(unlockedRows.map((r) => r.type as AchievementType)) };
}

/** Aplica en memoria el cambio de log que aún no se ha escrito, para que racha/logros se calculen sobre el estado final. */
function applyLogChange(logs: LogStatusRow[], date: string, newStatus: string | null): LogStatusRow[] {
  const filtered = logs.filter((l) => l.date !== date);
  return newStatus === null ? filtered : [...filtered, { date, status: newStatus }];
}

function achievementInsertStatements(userId: string, habitId: string, unlocked: AchievementType[]) {
  return unlocked.map((type) => db.insert(achievements).values({ id: nanoid(), userId, habitId, type }));
}

function revalidateCheckinPaths() {
  revalidatePath("/");
  revalidatePath("/historial");
  revalidatePath("/estadisticas");
  revalidatePath("/habitos");
}

export async function logHabit(input: LogInput) {
  const values = logSchema.parse(input);
  const userId = await getCurrentUserId();
  const context = await loadHabitContext(userId, values.habitId);
  if (!context) return { unlocked: [] };
  const { habit, logs, alreadyUnlockedTypes } = context;

  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const updatedLogs = applyLogChange(logs, values.date, values.status);
  const streak = computeStreak(habit as HabitRow, updatedLogs, today);
  const unlocked = streak
    ? computeNewAchievements({ habit: habit as HabitRow, logs: updatedLogs, streak, alreadyUnlockedTypes, today })
    : [];

  // Hora de "completado" solo cuando el status es done — cualquier otro
  // status la deja en null (incluido el caso de bajar de done a otro
  // status en una edición posterior), y desmarcar borra la fila entera
  // (ver deleteLog), así que no hay nada que limpiar ahí.
  const completedAt = values.status === "done" ? new Date().toISOString() : null;

  await db.batch([
    db
      .insert(habitLogs)
      .values({
        id: `${values.habitId}:${values.date}`,
        userId,
        habitId: values.habitId,
        date: values.date,
        status: values.status,
        value: values.value ?? null,
        note: values.note || null,
        mood: values.mood ?? null,
        completedAt,
      })
      .onConflictDoUpdate({
        target: [habitLogs.habitId, habitLogs.date],
        set: {
          status: values.status,
          value: values.value ?? null,
          note: values.note || null,
          mood: values.mood ?? null,
          completedAt,
        },
      }),
    ...(streak
      ? [
          db
            .insert(habitStreaks)
            .values({ habitId: values.habitId, userId, lastComputedDate: today, ...streak })
            .onConflictDoUpdate({ target: habitStreaks.habitId, set: { lastComputedDate: today, ...streak } }),
        ]
      : []),
    ...achievementInsertStatements(userId, values.habitId, unlocked),
  ]);

  revalidateCheckinPaths();
  return { unlocked };
}

export async function freezeHabitDay(habitId: string, date: string) {
  const userId = await getCurrentUserId();
  const context = await loadHabitContext(userId, habitId);
  if (!context) return { ok: false as const, unlocked: [] };
  const { habit, logs, alreadyUnlockedTypes } = context;

  const month = monthKey(date);
  const usedThisMonth = logs.filter((l) => monthKey(l.date) === month && l.status === "frozen" && l.date !== date).length;
  if (usedThisMonth >= FREEZE_MONTHLY_ALLOWANCE) {
    return { ok: false as const, unlocked: [] };
  }

  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const updatedLogs = applyLogChange(logs, date, "frozen");
  const streak = computeStreak(habit as HabitRow, updatedLogs, today);
  const unlocked = streak
    ? computeNewAchievements({ habit: habit as HabitRow, logs: updatedLogs, streak, alreadyUnlockedTypes, today })
    : [];

  await db.batch([
    db
      .insert(habitLogs)
      .values({ id: `${habitId}:${date}`, userId, habitId, date, status: "frozen" })
      .onConflictDoUpdate({
        target: [habitLogs.habitId, habitLogs.date],
        set: { status: "frozen", value: null, note: null, mood: null, completedAt: null },
      }),
    ...(streak
      ? [
          db
            .insert(habitStreaks)
            .values({ habitId, userId, lastComputedDate: today, ...streak })
            .onConflictDoUpdate({ target: habitStreaks.habitId, set: { lastComputedDate: today, ...streak } }),
        ]
      : []),
    ...achievementInsertStatements(userId, habitId, unlocked),
  ]);

  revalidateCheckinPaths();
  return { ok: true as const, unlocked };
}

export async function deleteLog(habitId: string, date: string) {
  const userId = await getCurrentUserId();
  const context = await loadHabitContext(userId, habitId);
  if (!context) return;
  const { habit, logs } = context;

  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const updatedLogs = applyLogChange(logs, date, null);
  const streak = computeStreak(habit as HabitRow, updatedLogs, today);

  await db.batch([
    db.delete(habitLogs).where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date))),
    ...(streak
      ? [
          db
            .insert(habitStreaks)
            .values({ habitId, userId, lastComputedDate: today, ...streak })
            .onConflictDoUpdate({ target: habitStreaks.habitId, set: { lastComputedDate: today, ...streak } }),
        ]
      : []),
  ]);

  revalidatePath("/");
  revalidatePath("/historial");
  revalidatePath("/estadisticas");
}
