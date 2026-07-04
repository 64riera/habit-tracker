import { z } from "zod";

export const habitFormSchema = z.object({
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
});

export type HabitFormValues = z.infer<typeof habitFormSchema>;

export const logSchema = z.object({
  habitId: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["done", "partial", "missed", "justified", "skipped", "frozen"]),
  value: z.coerce.number().optional(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  mood: z.coerce.number().min(1).max(5).optional(),
});
