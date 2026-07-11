import { z } from "zod";
import {
  BREAK_DURATION_MAX_MINUTES,
  BREAK_DURATION_MIN_MINUTES,
  BREAK_INTERVAL_MAX_MINUTES,
  BREAK_INTERVAL_MIN_MINUTES,
  COUNTDOWN_MAX_MINUTES,
  COUNTDOWN_MIN_MINUTES,
} from "@/lib/focus/compute";

export const startFocusSessionSchema = z
  .object({
    mode: z.enum(["countdown", "stopwatch"]),
    durationMinutes: z.coerce.number().min(COUNTDOWN_MIN_MINUTES).max(COUNTDOWN_MAX_MINUTES).optional(),
    breaksEnabled: z.coerce.boolean().optional(),
    breakIntervalMinutes: z.coerce.number().min(BREAK_INTERVAL_MIN_MINUTES).max(BREAK_INTERVAL_MAX_MINUTES).optional(),
    breakDurationMinutes: z.coerce.number().min(BREAK_DURATION_MIN_MINUTES).max(BREAK_DURATION_MAX_MINUTES).optional(),
    habitId: z.string().trim().optional().or(z.literal("")),
    categoryId: z.string().trim().optional().or(z.literal("")),
  })
  .refine((v) => v.mode !== "countdown" || v.durationMinutes !== undefined, {
    message: "La cuenta regresiva necesita una duración",
    path: ["durationMinutes"],
  })
  .refine((v) => !v.breaksEnabled || v.breakIntervalMinutes !== undefined, {
    message: "Falta el intervalo de las pausas activas",
    path: ["breakIntervalMinutes"],
  })
  .refine((v) => !v.breaksEnabled || v.breakDurationMinutes !== undefined, {
    message: "Falta la duración de la pausa activa",
    path: ["breakDurationMinutes"],
  });

export type StartFocusSessionValues = z.infer<typeof startFocusSessionSchema>;

/** Extrae los campos crudos del formulario de inicio, listos para `startFocusSessionSchema.parse`. */
export function extractStartFocusSessionFields(formData: FormData): unknown {
  return {
    mode: formData.get("mode"),
    durationMinutes: formData.get("durationMinutes") || undefined,
    breaksEnabled: formData.get("breaksEnabled") === "on",
    breakIntervalMinutes: formData.get("breakIntervalMinutes") || undefined,
    breakDurationMinutes: formData.get("breakDurationMinutes") || undefined,
    habitId: formData.get("habitId") ?? "",
    categoryId: formData.get("categoryId") ?? "",
  };
}

export const focusSettingsSchema = z.object({
  dailyGoalMinutes: z.coerce.number().min(5).max(720),
});
