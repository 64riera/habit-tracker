import type { habits } from "@/lib/db/schema";

/** Binary habits linked to a focus session auto-complete once the session
 * has been actively worked for longer than this many minutes. */
export const BINARY_HABIT_AUTO_COMPLETE_MINUTES = 20;

type AutoCompleteHabit = Pick<typeof habits.$inferSelect, "goalType" | "goalTarget">;

/**
 * Seconds of active focus time after which a habit linked to a focus
 * session should be marked done for the day, or `null` if this goal type
 * has no such rule (quantitative habits aren't driven by focus time, so
 * they're left for the user to log by hand).
 */
export function habitAutoCompleteThresholdSeconds(habit: AutoCompleteHabit): number | null {
  if (habit.goalType === "binary") return BINARY_HABIT_AUTO_COMPLETE_MINUTES * 60;
  if (habit.goalType === "duration") {
    return habit.goalTarget != null ? Math.round(habit.goalTarget * 60) : null;
  }
  return null;
}

/** True once `activeSeconds` has gone strictly past the habit's threshold —
 * "supera los 20 minutos" for binary habits, "supera por un segundo la
 * duración" for duration habits: both are the first second past the mark. */
export function shouldAutoCompleteHabit(activeSeconds: number, habit: AutoCompleteHabit): boolean {
  const threshold = habitAutoCompleteThresholdSeconds(habit);
  return threshold !== null && activeSeconds > threshold;
}
