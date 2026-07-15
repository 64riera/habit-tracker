"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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

const TRANSACTION_BUSY_RETRIES = 3;

/** A local SQLite file (dev) rejects a second concurrent writer transaction
 * outright with SQLITE_BUSY instead of queueing it — verified directly
 * against libsql's local driver. Without retrying, the "loser" of a
 * genuine race (see freezeHabitDay below) would surface as an unhandled
 * 500 instead of the graceful `{ ok: false }` a quota-exceeded refusal
 * already returns. A short retry with jittered backoff lets the second
 * transaction simply run again once the first has released the lock. */
async function withBusyRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (err) {
      const isBusy = err instanceof Error && "code" in err && (err as { code?: string }).code === "SQLITE_BUSY";
      if (!isBusy || attempt >= TRANSACTION_BUSY_RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 60));
    }
  }
}

function revalidateCheckinPaths() {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/stats");
  revalidatePath("/habits");
  notifyDeviceSync("habits");
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
  const { habit } = context;
  const month = monthKey(date);

  // The quota check and the write both happen inside one transaction,
  // re-reading the month's frozen count fresh from `tx` rather than reusing
  // `context.logs` (read before the transaction started). Two concurrent
  // freeze calls previously could both read "0 used this month" before
  // either had committed, so both passed the check and both wrote —
  // exceeding FREEZE_MONTHLY_ALLOWANCE. A transaction serializes them: the
  // second one only starts once the first has committed, so it sees the
  // first's write and correctly refuses.
  const frozen = await withBusyRetry(() =>
    db.transaction(async (tx) => {
      const monthLogs = await tx
        .select({ date: habitLogs.date, status: habitLogs.status })
        .from(habitLogs)
        .where(eq(habitLogs.habitId, habitId));
      const usedThisMonth = monthLogs.filter(
        (l) => monthKey(l.date) === month && l.status === "frozen" && l.date !== date
      ).length;
      if (usedThisMonth >= FREEZE_MONTHLY_ALLOWANCE) return false;

      await tx
        .insert(habitLogs)
        .values({ id: `${habitId}:${date}`, userId, habitId, date, status: "frozen" })
        .onConflictDoUpdate({
          target: [habitLogs.habitId, habitLogs.date],
          set: { status: "frozen", value: null, note: null, mood: null, completedAt: null },
        });
      return true;
    })
  );

  if (!frozen) return { ok: false as const, unlocked: [] };

  // Streak/achievements aren't part of the race above (duplicate
  // achievement inserts are already guarded by their own unique index —
  // see lib/db/schema.ts) — recomputed here from a fresh read of the
  // now-committed state, same as every other check-in write.
  const freshContext = await loadHabitContext(userId, habitId);
  const today = await getServerToday();
  const streak = freshContext ? computeStreak(habit as HabitRow, freshContext.logs, today) : null;
  const unlocked =
    streak && freshContext
      ? computeNewAchievements({
          habit: habit as HabitRow,
          logs: freshContext.logs,
          streak,
          alreadyUnlockedTypes: freshContext.alreadyUnlockedTypes,
          today,
        })
      : [];

  const followUpStatements = [
    ...(streak
      ? [
          db
            .insert(habitStreaks)
            .values({ habitId, userId, lastComputedDate: today, ...streak })
            .onConflictDoUpdate({ target: habitStreaks.habitId, set: { lastComputedDate: today, ...streak } }),
        ]
      : []),
    ...achievementInsertStatements(userId, habitId, unlocked),
  ];
  if (followUpStatements.length > 0) {
    await db.batch(followUpStatements as [(typeof followUpStatements)[number], ...(typeof followUpStatements)[number][]]);
  }

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
