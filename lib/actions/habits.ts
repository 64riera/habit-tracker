"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { habits } from "@/lib/db/schema";
import { habitFormSchema } from "@/lib/validation/habit";
import type { FrequencyConfig } from "@/lib/habits/frequency";

function buildFrequencyConfig(input: {
  frequencyType: string;
  weekdays?: number[];
  timesPerPeriod?: number;
  intervalDays?: number;
}): FrequencyConfig {
  switch (input.frequencyType) {
    case "weekdays":
      return { days: input.weekdays ?? [] };
    case "x_per_week":
    case "x_per_month":
      return { timesPerPeriod: input.timesPerPeriod ?? 1 };
    case "custom_interval":
      return { intervalDays: input.intervalDays ?? 1 };
    default:
      return {};
  }
}

export type HabitFormState = { error?: string };

function parseFormData(formData: FormData) {
  const weekdays = formData.getAll("weekdays").map(Number);
  return habitFormSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    goalType: formData.get("goalType"),
    goalTarget: formData.get("goalTarget") || undefined,
    goalUnit: formData.get("goalUnit") ?? "",
    frequencyType: formData.get("frequencyType"),
    weekdays,
    timesPerPeriod: formData.get("timesPerPeriod") || undefined,
    intervalDays: formData.get("intervalDays") || undefined,
    reminderTime: formData.get("reminderTime") ?? "",
    hardMode: formData.get("hardMode") === "on",
    skipDaysAllowed: formData.get("skipDaysAllowed") || 0,
    startDate: formData.get("startDate"),
    isPinned: formData.get("isPinned") === "on",
  });
}

export async function createHabit(
  _prevState: HabitFormState,
  formData: FormData
): Promise<HabitFormState> {
  let values;
  try {
    values = parseFormData(formData);
  } catch {
    return { error: "invalid" };
  }
  const frequencyConfig = buildFrequencyConfig(values);

  await db.insert(habits).values({
    id: nanoid(),
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
  });

  revalidatePath("/");
  revalidatePath("/habitos");
  redirect("/habitos");
}

export async function updateHabit(
  habitId: string,
  _prevState: HabitFormState,
  formData: FormData
): Promise<HabitFormState> {
  let values;
  try {
    values = parseFormData(formData);
  } catch {
    return { error: "invalid" };
  }
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
    .where(eq(habits.id, habitId));

  revalidatePath("/");
  revalidatePath("/habitos");
  revalidatePath(`/habitos/${habitId}`);
  redirect("/habitos");
}

export async function archiveHabit(habitId: string) {
  await db.update(habits).set({ status: "archived" }).where(eq(habits.id, habitId));
  revalidatePath("/");
  revalidatePath("/habitos");
  redirect("/habitos");
}

export async function restoreHabit(habitId: string) {
  await db.update(habits).set({ status: "active" }).where(eq(habits.id, habitId));
  revalidatePath("/");
  revalidatePath("/habitos");
}

export async function togglePinHabit(habitId: string, pinned: boolean) {
  await db.update(habits).set({ isPinned: pinned }).where(eq(habits.id, habitId));
  revalidatePath("/");
  revalidatePath("/habitos");
}

export async function reorderHabits(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(habits).set({ sortOrder: index }).where(eq(habits.id, id))
    )
  );
  revalidatePath("/");
  revalidatePath("/habitos");
}
