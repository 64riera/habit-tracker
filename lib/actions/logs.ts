"use server";

import { and, eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { habitLogs, habits } from "@/lib/db/schema";
import { logSchema } from "@/lib/validation/habit";
import { recalcStreakForHabit } from "@/lib/streaks";
import { maybeUnlockAchievements } from "@/lib/achievements";
import { monthKey } from "@/lib/date";
import { FREEZE_MONTHLY_ALLOWANCE } from "@/lib/habits/status";
import { getCurrentUserId } from "@/lib/auth/session";

export type LogInput = {
  habitId: string;
  date: string;
  status: "done" | "partial" | "missed" | "justified" | "skipped" | "frozen";
  value?: number;
  note?: string;
  mood?: number;
};

async function ownsHabit(userId: string, habitId: string): Promise<boolean> {
  const [habit] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1);
  return !!habit;
}

export async function logHabit(input: LogInput) {
  const values = logSchema.parse(input);
  const userId = await getCurrentUserId();
  if (!(await ownsHabit(userId, values.habitId))) return { unlocked: [] };

  await db
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
    })
    .onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.date],
      set: {
        status: values.status,
        value: values.value ?? null,
        note: values.note || null,
        mood: values.mood ?? null,
      },
    });

  await recalcStreakForHabit(values.habitId);
  const unlocked = await maybeUnlockAchievements(values.habitId);

  revalidatePath("/");
  revalidatePath("/historial");
  revalidatePath("/estadisticas");
  revalidatePath("/habitos");

  return { unlocked };
}

export async function freezeHabitDay(habitId: string, date: string) {
  const userId = await getCurrentUserId();
  if (!(await ownsHabit(userId, habitId))) return { ok: false as const, unlocked: [] };

  const month = monthKey(date);
  const monthLogs = await db
    .select({ date: habitLogs.date, status: habitLogs.status })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), like(habitLogs.date, `${month}-%`)));

  const usedThisMonth = monthLogs.filter((l) => l.status === "frozen" && l.date !== date).length;
  if (usedThisMonth >= FREEZE_MONTHLY_ALLOWANCE) {
    return { ok: false as const, unlocked: [] };
  }

  await db
    .insert(habitLogs)
    .values({ id: `${habitId}:${date}`, userId, habitId, date, status: "frozen" })
    .onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.date],
      set: { status: "frozen", value: null, note: null, mood: null },
    });

  await recalcStreakForHabit(habitId);
  const unlocked = await maybeUnlockAchievements(habitId);

  revalidatePath("/");
  revalidatePath("/historial");
  revalidatePath("/estadisticas");
  revalidatePath("/habitos");

  return { ok: true as const, unlocked };
}

export async function deleteLog(habitId: string, date: string) {
  const userId = await getCurrentUserId();
  if (!(await ownsHabit(userId, habitId))) return;

  await db
    .delete(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));
  await recalcStreakForHabit(habitId);

  revalidatePath("/");
  revalidatePath("/historial");
  revalidatePath("/estadisticas");
}
