"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db/client";
import { habitLogs, habitStreaks } from "@/lib/db/schema";
import { computeStreak, type HabitRow } from "@/lib/streaks/compute";
import { computeNewAchievements } from "@/lib/achievements/compute";
import { monthKey } from "@/lib/date";
import { FREEZE_MONTHLY_ALLOWANCE } from "@/lib/habits/status";
import { getServerToday } from "@/lib/settings/date-server";
import { getCurrentUserId } from "@/lib/auth/session";
import { notifyDeviceSync } from "@/lib/realtime/notify";
import {
  achievementInsertStatements,
  applyLogChange,
  loadHabitContext,
  writeHabitLog,
  type LogInput,
} from "@/lib/habits/log-write";

function revalidateCheckinPaths() {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/stats");
  revalidatePath("/habits");
  after(() => notifyDeviceSync());
}

export async function logHabit(input: LogInput) {
  const userId = await getCurrentUserId();
  const result = await writeHabitLog(userId, input);
  revalidateCheckinPaths();
  return result;
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

  const today = await getServerToday();
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

  const today = await getServerToday();
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

  revalidateCheckinPaths();
}
