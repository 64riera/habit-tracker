import { z } from "zod";

export const habitFormSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(280).optional().or(z.literal("")),
    categoryId: z.string().optional().or(z.literal("")),
    goalType: z.enum(["binary", "quantitative", "duration"]),
    goalTarget: z.coerce.number().positive().optional(),
    goalUnit: z.string().trim().max(20).optional().or(z.literal("")),
    frequencyType: z.enum(["daily", "weekdays", "x_per_week", "x_per_month", "custom_interval"]),
    weekdays: z.array(z.coerce.number().min(1).max(7)).optional(),
    timesPerPeriod: z.coerce.number().min(1).max(30).optional(),
    intervalDays: z.coerce.number().min(1).max(60).optional(),
    reminderTime: z.string().trim().optional().or(z.literal("")),
    hardMode: z.coerce.boolean().optional(),
    skipDaysAllowed: z.coerce.number().min(0).max(10).optional(),
    startDate: z.string().min(1),
    isPinned: z.coerce.boolean().optional(),
  })
  // Without this, a "weekdays" habit can be saved with no day selected:
  // isDateApplicable() then never matches, so the habit is silently
  // unreachable — its streak stays stuck at 0 forever (same class of bug
  // task.ts already guards against for custom_weekdays).
  .refine((v) => v.frequencyType !== "weekdays" || (v.weekdays?.length ?? 0) > 0, {
    message: "weekdays requires at least one day",
    path: ["weekdays"],
  });

export type HabitFormValues = z.infer<typeof habitFormSchema>;

/** Extracts the raw fields from the habit form, ready for `habitFormSchema.safeParse`. */
export function extractHabitFields(formData: FormData): unknown {
  const weekdays = formData.getAll("weekdays").map(Number);
  return {
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
  };
}

export const logSchema = z.object({
  habitId: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["done", "partial", "missed", "justified", "skipped", "frozen"]),
  value: z.coerce.number().optional(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  mood: z.coerce.number().min(1).max(5).optional(),
});
