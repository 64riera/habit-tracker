import { z } from "zod";

export const gymSetSchema = z.object({
  weight: z.string().trim().max(20).optional(),
  reps: z.coerce.number().int().positive().max(999),
});

export const gymExerciseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  note: z.string().trim().max(200).optional(),
  sets: z.array(gymSetSchema).min(1),
});

export const gymSessionFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exercises: z.array(gymExerciseSchema).min(1),
});

export type GymSessionFormValues = z.infer<typeof gymSessionFormSchema>;

/** `exercises` travels as a JSON string in a hidden field — FormData has no
 * native way to encode a variable-depth array of exercises/sets, and this
 * app has no existing convention for dynamic nested form fields (unlike
 * e.g. tasks' recurrenceConfig, which is built server-side from a handful
 * of flat named fields). The form component keeps the array as React state
 * and mirrors it into the hidden input on every change. */
export function extractGymSessionFields(formData: FormData): unknown {
  let exercises: unknown = [];
  try {
    exercises = JSON.parse(String(formData.get("exercises") ?? "[]"));
  } catch {
    exercises = [];
  }
  return { date: formData.get("date"), exercises };
}
