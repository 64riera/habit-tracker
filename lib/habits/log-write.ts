import "server-only";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { achievements, habitLogs, habitStreaks, habits } from "@/lib/db/schema";
import { logSchema } from "@/lib/validation/habit";
import { computeStreak, type HabitRow, type LogStatusRow } from "@/lib/streaks/compute";
import { computeNewAchievements, type AchievementType } from "@/lib/achievements/compute";
import { getServerToday } from "@/lib/settings/date-server";

export type LogInput = {
  habitId: string;
  date: string;
  status: "done" | "partial" | "missed" | "justified" | "skipped" | "frozen";
  value?: number;
  note?: string;
  mood?: number;
};

/**
 * Every check-in write follows the same pattern: one batched read (1
 * round-trip to Turso via db.batch), pure in-memory computation, and one
 * batched write (another round-trip). Shared by the user-facing check-in
 * actions (lib/actions/logs.ts) and by automatic completion sources — e.g.
 * a focus session linked to a habit (see autoCompleteLinkedHabitIfDue in
 * lib/queries/focus.ts) — that need the exact same streak/achievement
 * bookkeeping without going through a cookie-authenticated Server Action.
 */
export async function loadHabitContext(userId: string, habitId: string) {
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

/** Applies the not-yet-written log change in memory, so streak/achievements are computed against the final state. */
export function applyLogChange(logs: LogStatusRow[], date: string, newStatus: string | null): LogStatusRow[] {
  const filtered = logs.filter((l) => l.date !== date);
  return newStatus === null ? filtered : [...filtered, { date, status: newStatus }];
}

export function achievementInsertStatements(userId: string, habitId: string, unlocked: AchievementType[]) {
  return unlocked.map((type) => db.insert(achievements).values({ id: nanoid(), userId, habitId, type }));
}

/**
 * Core check-in write: validates, computes the resulting streak/achievements,
 * and persists — with no cache invalidation, so it's safe to call from
 * render-time code (e.g. focus session reconciliation, which can run during
 * a Server Component render where `revalidatePath` isn't allowed) as well as
 * from Server Actions. Server Action callers revalidate afterward themselves
 * (see logHabit in lib/actions/logs.ts).
 */
export async function writeHabitLog(userId: string, input: LogInput): Promise<{ unlocked: AchievementType[] }> {
  const values = logSchema.parse(input);
  const context = await loadHabitContext(userId, values.habitId);
  if (!context) return { unlocked: [] };
  const { habit, logs, alreadyUnlockedTypes } = context;

  const today = await getServerToday();
  const updatedLogs = applyLogChange(logs, values.date, values.status);
  const streak = computeStreak(habit as HabitRow, updatedLogs, today);
  const unlocked = streak
    ? computeNewAchievements({ habit: habit as HabitRow, logs: updatedLogs, streak, alreadyUnlockedTypes, today })
    : [];

  // "Completed" timestamp only when status is done — any other status
  // leaves it null (including the case of downgrading from done to
  // another status in a later edit), and unchecking deletes the whole row
  // (see deleteLog), so there's nothing to clean up there.
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

  return { unlocked };
}
