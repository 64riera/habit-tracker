"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { habitLogs } from "@/lib/db/schema";
import { logSchema } from "@/lib/validation/habit";
import { recalcStreakForHabit } from "@/lib/streaks";
import { maybeUnlockAchievements } from "@/lib/achievements";

export type LogInput = {
  habitId: string;
  date: string;
  status: "done" | "partial" | "missed" | "justified" | "skipped" | "frozen";
  value?: number;
  note?: string;
  mood?: number;
};

export async function logHabit(input: LogInput) {
  const values = logSchema.parse(input);

  await db
    .insert(habitLogs)
    .values({
      id: `${values.habitId}:${values.date}`,
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

export async function deleteLog(habitId: string, date: string) {
  await db
    .delete(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));
  await recalcStreakForHabit(habitId);

  revalidatePath("/");
  revalidatePath("/historial");
  revalidatePath("/estadisticas");
}
