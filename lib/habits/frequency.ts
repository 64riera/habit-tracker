import { isoWeekday, parseISODate, startOfMonth, startOfWeek } from "@/lib/date";

export type FrequencyType =
  | "daily"
  | "weekdays"
  | "x_per_week"
  | "x_per_month"
  | "custom_interval";

/** Config JSON guardada en habits.frequency_config, según frequency_type. */
export type FrequencyConfig = {
  /** weekdays: días ISO (1=lunes..7=domingo) en que aplica el hábito */
  days?: number[];
  /** x_per_week / x_per_month: cuántas veces hay que cumplirlo en el período */
  timesPerPeriod?: number;
  /** custom_interval: cada cuántos días aplica, contando desde start_date */
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

/** Construye el `frequency_config` a partir de los campos crudos de un formulario de hábito. */
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
 * ¿El hábito "aplica" (se espera un check-in) en esta fecha?
 * Para x_per_week / x_per_month no hay un día fijo: aplica todos los días del período
 * hasta que se cumpla la cuota, así que se consideran "aplicables" todos los días.
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
