import { z } from "zod";
import { isoDateSchema } from "./primitives";

export const gymSetSchema = z.object({
  weight: z.string().trim().max(20).optional(),
  reps: z.coerce.number().int().positive().max(999),
});

export const gymExerciseSchema = z.object({
  exerciseId: z.string().trim().min(1),
  note: z.string().trim().max(200).optional(),
  sets: z.array(gymSetSchema).min(1),
});

export const gymSessionFormSchema = z.object({
  date: isoDateSchema,
  exercises: z.array(gymExerciseSchema).min(1),
  // Only set when editing an existing session — the updatedAt the form read
  // when it opened, round-tripped as an optimistic-concurrency token (see
  // updateGymSessionCore). Absent for a brand-new session.
  expectedUpdatedAt: z.string().optional().or(z.literal("")),
});

export type GymSessionFormValues = z.infer<typeof gymSessionFormSchema>;

/**
 * Deliberately permissive sibling of gymSessionFormSchema, used only for
 * autosaved drafts (see saveGymSessionDraftCore). A draft is captured
 * mid-typing — e.g. a set whose reps field is still empty — so it can't be
 * held to the same business-correctness rules as a real save (positive
 * reps, at least one set/exercise). This only guards shape and size against
 * abuse; it's never treated as a valid, complete session.
 */
export const gymSessionDraftSchema = z.object({
  date: z.string().trim().max(10),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().trim().max(100),
        note: z.string().trim().max(200).optional(),
        sets: z.array(z.object({ weight: z.string().trim().max(20).optional(), reps: z.string().trim().max(10) })).max(50),
      })
    )
    .max(50),
});

export type GymSessionDraftValues = z.infer<typeof gymSessionDraftSchema>;

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
  return { date: formData.get("date"), exercises, expectedUpdatedAt: formData.get("expectedUpdatedAt") ?? "" };
}
