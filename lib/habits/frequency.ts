import { isoWeekday, parseISODate, startOfMonth, startOfWeek } from "@/lib/date";

export type FrequencyType =
  | "daily"
  | "weekdays"
  | "x_per_week"
  | "x_per_month"
  | "custom_interval";

/** Config JSON stored in habits.frequency_config, depending on frequency_type. */
export type FrequencyConfig = {
  /** weekdays: ISO days (1=Monday..7=Sunday) on which the habit applies */
  days?: number[];
  /** x_per_week / x_per_month: how many times it must be completed in the period */
  timesPerPeriod?: number;
  /** custom_interval: how many days between occurrences, counting from start_date */
  intervalDays?: number;
};

export function parseFrequencyConfig(raw: string | null): FrequencyConfig {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as FrequencyConfig;
  } catch {
    return {};
  }
}

/** Builds the `frequency_config` from the raw fields of a habit form. */
export function buildFrequencyConfig(input: {
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

export type HabitFrequencyInfo = {
  frequencyType: string;
  frequencyConfig: string | null;
  startDate: string;
};

/**
 * Does the habit "apply" (is a check-in expected) on this date?
 * For x_per_week / x_per_month there's no fixed day: it applies every day of the
 * period until the quota is met, so every day is considered "applicable".
 */
export function isDateApplicable(habit: HabitFrequencyInfo, date: string): boolean {
  if (date < habit.startDate) return false;
  const cfg = parseFrequencyConfig(habit.frequencyConfig);

  switch (habit.frequencyType) {
    case "daily":
      return true;
    case "weekdays":
      return (cfg.days ?? [1, 2, 3, 4, 5, 6, 7]).includes(isoWeekday(date));
    case "x_per_week":
    case "x_per_month":
      return true;
    case "custom_interval": {
      const interval = cfg.intervalDays ?? 1;
      const start = parseISODate(habit.startDate).getTime();
      const current = parseISODate(date).getTime();
      const diffDays = Math.round((current - start) / 86_400_000);
      return diffDays % interval === 0;
    }
    default:
      return true;
  }
}

export function periodKeyFor(habit: HabitFrequencyInfo, date: string): string {
  return habit.frequencyType === "x_per_month" ? startOfMonth(date) : startOfWeek(date);
}
