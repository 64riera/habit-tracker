import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { taskCompletions, tasks } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { currentPeriodKey } from "@/lib/tasks/recurrence";

export type TaskRow = typeof tasks.$inferSelect;
export type TaskWithStatus = TaskRow & { isDone: boolean; periodKey: string };

export async function getTasks(): Promise<TaskRow[]> {
  const userId = await getCurrentUserId();
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(tasks.createdAt);
}

/**
 * Tasks with whether each is done for its own current period — a task is
 * "done" simply when a completion row exists whose periodKey matches the
 * period currently in effect (see lib/tasks/recurrence.ts::currentPeriodKey);
 * there's no separate reset step. Sorted pending-first, then by creation
 * order, matching the usual checklist feel.
 */
export async function getTasksWithStatus(today: string): Promise<TaskWithStatus[]> {
  const rows = await getTasks();
  if (rows.length === 0) return [];

  const withPeriod = rows.map((task) => ({ task, periodKey: currentPeriodKey(task, today) }));
  const completionIds = withPeriod.map(({ task, periodKey }) => `${task.id}:${periodKey}`);
  const completions = await db
    .select({ id: taskCompletions.id })
    .from(taskCompletions)
    .where(inArray(taskCompletions.id, completionIds));
  const doneIds = new Set(completions.map((c) => c.id));

  return withPeriod
    .map(({ task, periodKey }) => ({ ...task, periodKey, isDone: doneIds.has(`${task.id}:${periodKey}`) }))
    .sort((a, b) => Number(a.isDone) - Number(b.isDone));
}
