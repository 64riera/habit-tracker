import { addDays, daysBetween, isoWeekday, monthKey, startOfWeek } from "@/lib/date";

export type TaskRecurrenceType = "daily" | "weekly" | "monthly" | "yearly" | "custom_interval" | "custom_weekdays";

/** Config JSON stored in tasks.recurrence_config, depending on recurrence_type. */
export type TaskRecurrenceConfig = {
  /** monthly: day of month (1-31) the task is anchored to — shown for reference, doesn't gate completion */
  dayOfMonth?: number;
  /** yearly: month (1-12) the task is anchored to */
  month?: number;
  /** yearly: day of that month (1-31) */
  day?: number;
  /** custom_interval: days between occurrences, counting from start_date */
  intervalDays?: number;
  /** custom_weekdays: ISO days (1=Monday..7=Sunday) the task applies on */
  weekdays?: number[];
};

export function parseTaskRecurrenceConfig(raw: string | null): TaskRecurrenceConfig {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as TaskRecurrenceConfig;
  } catch {
    return {};
  }
}

/** Builds the `recurrence_config` from the raw fields of a task form. */
export function buildTaskRecurrenceConfig(input: {
  recurrenceType: string;
  dayOfMonth?: number;
  month?: number;
  day?: number;
  intervalDays?: number;
  weekdays?: number[];
}): TaskRecurrenceConfig {
  switch (input.recurrenceType) {
    case "monthly":
      return { dayOfMonth: input.dayOfMonth ?? 1 };
    case "yearly":
      return { month: input.month ?? 1, day: input.day ?? 1 };
    case "custom_interval":
      return { intervalDays: input.intervalDays ?? 1 };
    case "custom_weekdays":
      return { weekdays: input.weekdays ?? [] };
    default:
      return {};
  }
}

export type TaskRecurrenceInfo = {
  recurrenceType: string;
  recurrenceConfig: string | null;
  startDate: string;
};

/**
 * Does the task "apply" (is it relevant to act on) on this date? Only
 * custom_interval/custom_weekdays are gated to specific days — daily,
 * weekly, monthly and yearly are just period buckets: any day within the
 * period is fine to check them off.
 */
export function isTaskApplicableToday(task: TaskRecurrenceInfo, date: string): boolean {
  const cfg = parseTaskRecurrenceConfig(task.recurrenceConfig);
  switch (task.recurrenceType) {
    case "custom_weekdays":
      return (cfg.weekdays ?? []).includes(isoWeekday(date));
    case "custom_interval": {
      const interval = cfg.intervalDays ?? 1;
      const diffDays = Math.max(0, daysBetween(task.startDate, date));
      return diffDays % interval === 0;
    }
    default:
      return true;
  }
}

/**
 * The most recent applicable date on or before `date`. Used by
 * custom_interval/custom_weekdays so a task's checked state carries over on
 * non-applicable days instead of flickering back to "unchecked" — it keeps
 * showing whatever happened on the last day it was actually due, until the
 * next due day arrives and the period key moves forward.
 */
export function mostRecentApplicableDate(task: TaskRecurrenceInfo, date: string): string {
  const cfg = parseTaskRecurrenceConfig(task.recurrenceConfig);
  switch (task.recurrenceType) {
    case "custom_interval": {
      const interval = cfg.intervalDays ?? 1;
      const diffDays = Math.max(0, daysBetween(task.startDate, date));
      return addDays(date, -(diffDays % interval));
    }
    case "custom_weekdays": {
      const weekdays = cfg.weekdays ?? [];
      for (let back = 0; back <= 6; back++) {
        const candidate = addDays(date, -back);
        if (weekdays.includes(isoWeekday(candidate))) return candidate;
      }
      return date;
    }
    default:
      return date;
  }
}

/**
 * The key that groups "the current period" for a task: a completion whose
 * periodKey matches this is what makes it show as done. No batch job ever
 * "resets" a task — a new period simply has no matching completion yet.
 */
export function currentPeriodKey(task: TaskRecurrenceInfo, today: string): string {
  switch (task.recurrenceType) {
    case "daily":
      return today;
    case "weekly":
      return startOfWeek(today);
    case "monthly":
      return monthKey(today);
    case "yearly":
      return today.slice(0, 4);
    case "custom_interval":
    case "custom_weekdays":
      return mostRecentApplicableDate(task, today);
    default:
      return today;
  }
}
