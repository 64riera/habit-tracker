"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { habits } from "@/lib/db/schema";
import { habitFormSchema, extractHabitFields } from "@/lib/validation/habit";
import { getCurrentUserId } from "@/lib/auth/session";
import { buildFrequencyConfig } from "@/lib/habits/frequency";

export type HabitFormState = { error?: string };

/**
 * Online path (form/`useActionState`): delegates the write to the core and
 * redirects here (real server-side navigation, not seen by the offline
 * replay log, which calls `createHabitCore` directly).
 */
export async function createHabit(
  _prevState: HabitFormState,
  formData: FormData
): Promise<HabitFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "invalid" };
  const result = await createHabitCore(id, extractHabitFields(formData));
  if (result.error) return result;
  redirect("/habits");
}

/**
 * Core reused by `createHabit` (online path) and by the offline replay
 * log. Doesn't redirect: the caller decides navigation.
 */
export async function createHabitCore(id: string, rawValues: unknown): Promise<HabitFormState> {
  const parsed = habitFormSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();
  const frequencyConfig = buildFrequencyConfig(values);

  // onConflictDoNothing: if the offline replay is retried (e.g. the drain
  // was interrupted right after inserting but before removing the mutation
  // from the queue), retrying the same creation shouldn't fail on an id
  // collision.
  await db.insert(habits).values({
    id,
    userId,
    categoryId: values.categoryId || null,
    name: values.name,
    description: values.description || null,
    goalType: values.goalType,
    goalTarget: values.goalType === "binary" ? null : values.goalTarget ?? null,
    goalUnit: values.goalType === "binary" ? null : values.goalUnit || null,
    frequencyType: values.frequencyType,
    frequencyConfig: JSON.stringify(frequencyConfig),
    reminders: values.reminderTime ? JSON.stringify([values.reminderTime]) : null,
    hardMode: values.hardMode ?? false,
    skipDaysAllowed: values.skipDaysAllowed ?? 0,
    startDate: values.startDate,
    isPinned: values.isPinned ?? false,
    status: "active",
  }).onConflictDoNothing({ target: habits.id });

  revalidatePath("/");
  revalidatePath("/habits");
  return {};
}

export async function updateHabit(
  habitId: string,
  _prevState: HabitFormState,
  formData: FormData
): Promise<HabitFormState> {
  const result = await updateHabitCore(habitId, extractHabitFields(formData));
  if (result.error) return result;
  redirect("/habits");
}

export async function updateHabitCore(habitId: string, rawValues: unknown): Promise<HabitFormState> {
  const parsed = habitFormSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();
  const frequencyConfig = buildFrequencyConfig(values);

  await db
    .update(habits)
    .set({
      categoryId: values.categoryId || null,
      name: values.name,
      description: values.description || null,
      goalType: values.goalType,
      goalTarget: values.goalType === "binary" ? null : values.goalTarget ?? null,
      goalUnit: values.goalType === "binary" ? null : values.goalUnit || null,
      frequencyType: values.frequencyType,
      frequencyConfig: JSON.stringify(frequencyConfig),
      reminders: values.reminderTime ? JSON.stringify([values.reminderTime]) : null,
      hardMode: values.hardMode ?? false,
      skipDaysAllowed: values.skipDaysAllowed ?? 0,
      startDate: values.startDate,
      isPinned: values.isPinned ?? false,
    })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));

  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath(`/habits/${habitId}`);
  return {};
}

/** Online path: writes via the core and redirects. Offline replay uses `archiveHabitCore` directly. */
export async function archiveHabit(habitId: string): Promise<void> {
  await archiveHabitCore(habitId);
  redirect("/habits");
}

export async function archiveHabitCore(habitId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await db
    .update(habits)
    .set({ status: "archived" })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  revalidatePath("/");
  revalidatePath("/habits");
}

export async function restoreHabit(habitId: string) {
  const userId = await getCurrentUserId();
  await db
    .update(habits)
    .set({ status: "active" })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  revalidatePath("/");
  revalidatePath("/habits");
}

export async function togglePinHabit(habitId: string, pinned: boolean) {
  const userId = await getCurrentUserId();
  await db
    .update(habits)
    .set({ isPinned: pinned })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  revalidatePath("/");
  revalidatePath("/habits");
}

export async function reorderHabits(orderedIds: string[]) {
  const userId = await getCurrentUserId();
  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(habits)
        .set({ sortOrder: index })
        .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    )
  );
  revalidatePath("/");
  revalidatePath("/habits");
}
