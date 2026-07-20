import { z } from "zod";
import { hasAtLeastOneWeekday, extractWeekdays } from "./primitives";

// Caps Feb at 28 on purpose — sidesteps leap-year bookkeeping entirely for a
// field that's only ever a display reference ("cada 29 de febrero" would be
// confusing 3 years out of 4), not a hard date the app schedules against.
const MAX_DAY_FOR_MONTH: Record<number, number> = {
  1: 31,
  2: 28,
  3: 31,
  4: 30,
  5: 31,
  6: 30,
  7: 31,
  8: 31,
  9: 30,
  10: 31,
  11: 30,
  12: 31,
};

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    recurrenceType: z.enum(["daily", "weekly", "monthly", "yearly", "custom_interval", "custom_weekdays"]),
    dayOfMonth: z.coerce.number().min(1).max(31).optional(),
    month: z.coerce.number().min(1).max(12).optional(),
    day: z.coerce.number().min(1).max(31).optional(),
    intervalDays: z.coerce.number().min(1).max(365).optional(),
    weekdays: z.array(z.coerce.number().min(1).max(7)).optional(),
  })
  .refine((v) => v.recurrenceType !== "custom_weekdays" || hasAtLeastOneWeekday(v.weekdays), {
    message: "custom_weekdays requires at least one weekday",
    path: ["weekdays"],
  })
  .refine((v) => v.recurrenceType !== "yearly" || (v.day ?? 1) <= MAX_DAY_FOR_MONTH[v.month ?? 1], {
    message: "invalid day for the selected month",
    path: ["day"],
  });

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export function extractTaskFields(formData: FormData): unknown {
  const weekdays = extractWeekdays(formData);
  return {
    title: formData.get("title"),
    recurrenceType: formData.get("recurrenceType"),
    dayOfMonth: formData.get("dayOfMonth") || undefined,
    month: formData.get("month") || undefined,
    day: formData.get("day") || undefined,
    intervalDays: formData.get("intervalDays") || undefined,
    weekdays,
  };
}
