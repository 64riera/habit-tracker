"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { taskCompletions, tasks } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { getTodayDateString } from "@/lib/date";
import { buildTaskRecurrenceConfig } from "@/lib/tasks/recurrence";
import { extractTaskFields, taskFormSchema } from "@/lib/validation/task";

export type TaskFormState = { error?: string };

function revalidateTaskPaths() {
  revalidatePath("/");
  revalidatePath("/tasks");
}

export async function createTask(_prevState: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "invalid" };
  const result = await createTaskCore(id, extractTaskFields(formData));
  if (result.error) return result;
  redirect("/tasks");
}

export async function createTaskCore(id: string, rawValues: unknown): Promise<TaskFormState> {
  const parsed = taskFormSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

  // onConflictDoNothing: idempotent if the offline replay retries after a
  // drain gets interrupted between the insert and removing the mutation
  // from the queue (same reasoning as createHabitCore/createRoutineCore).
  await db
    .insert(tasks)
    .values({
      id,
      userId,
      title: values.title,
      recurrenceType: values.recurrenceType,
      recurrenceConfig: JSON.stringify(buildTaskRecurrenceConfig(values)),
      startDate: today,
    })
    .onConflictDoNothing({ target: tasks.id });

  revalidateTaskPaths();
  return {};
}

export async function updateTask(
  taskId: string,
  _prevState: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const result = await updateTaskCore(taskId, extractTaskFields(formData));
  if (result.error) return result;
  redirect("/tasks");
}

export async function updateTaskCore(taskId: string, rawValues: unknown): Promise<TaskFormState> {
  const parsed = taskFormSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();

  await db
    .update(tasks)
    .set({
      title: values.title,
      recurrenceType: values.recurrenceType,
      recurrenceConfig: JSON.stringify(buildTaskRecurrenceConfig(values)),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  revalidateTaskPaths();
  return {};
}

/** Online path: writes via the core and redirects. The offline replay uses `deleteTaskCore` directly. */
export async function deleteTask(taskId: string): Promise<void> {
  await deleteTaskCore(taskId);
  redirect("/tasks");
}

export async function deleteTaskCore(taskId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  revalidateTaskPaths();
}

/**
 * Marks/unmarks a task for the given period. `periodKey` is computed
 * client-side (lib/tasks/recurrence.ts::currentPeriodKey, same pure logic
 * the server uses when reading) and trusted only after the ownership check
 * below — a malicious `taskId` from another account simply matches nothing
 * and this becomes a no-op. Deterministic completion id
 * (`${taskId}:${periodKey}`) makes retries idempotent, mirroring the habit
 * check-in write. No separate "online action" wrapper: this same function
 * is both what the client calls directly (via runOrQueue's online replay)
 * and what the offline queue replays later — there's no form/navigation
 * involved, so there's nothing a wrapper would add.
 */
export async function toggleTaskCore(taskId: string, periodKey: string, done: boolean): Promise<void> {
  const userId = await getCurrentUserId();
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  if (!task) return;

  const id = `${taskId}:${periodKey}`;
  if (done) {
    await db
      .insert(taskCompletions)
      .values({ id, userId, taskId, periodKey })
      .onConflictDoNothing({ target: taskCompletions.id });
  } else {
    await db.delete(taskCompletions).where(eq(taskCompletions.id, id));
  }
  revalidateTaskPaths();
}
