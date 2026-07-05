import { z } from "zod";

export const routineSchema = z.object({
  name: z.string().trim().min(1).max(60),
  habitIds: z.array(z.string()).min(1),
});

export type RoutineFormValues = z.infer<typeof routineSchema>;

export function extractRoutineFields(formData: FormData): unknown {
  return { name: formData.get("name"), habitIds: formData.getAll("habitIds") };
}
