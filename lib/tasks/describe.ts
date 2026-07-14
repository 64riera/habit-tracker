import { translate } from "@/lib/i18n/t";
import { parseTaskRecurrenceConfig } from "./recurrence";

type RecurrenceTask = { recurrenceType: string; recurrenceConfig: string | null };

/** Human-readable recurrence text ("Cada 3 días", "L X V", "El día 15 de
 * cada mes"...), mirroring lib/habits/describe.ts::describeFrequency —
 * reuses the existing `habit.weekdayShort.*` dictionary instead of
 * duplicating weekday names for tasks. */
export function describeTaskRecurrence(task: RecurrenceTask, dict: unknown): string {
  const cfg = parseTaskRecurrenceConfig(task.recurrenceConfig);
  switch (task.recurrenceType) {
    case "daily":
      return translate(dict, "tasks.freqShort.daily");
    case "weekly":
      return translate(dict, "tasks.freqShort.weekly");
    case "monthly":
      return translate(dict, "tasks.freqShort.monthlyOnDay", { day: cfg.dayOfMonth ?? 1 });
    case "yearly":
      return translate(dict, "tasks.freqShort.yearlyOnDate", {
        day: cfg.day ?? 1,
        month: translate(dict, `tasks.monthLong.${cfg.month ?? 1}`),
      });
    case "custom_interval":
      return translate(dict, "tasks.freqShort.everyNDays", { n: cfg.intervalDays ?? 1 });
    case "custom_weekdays":
      return (cfg.weekdays ?? []).map((d) => translate(dict, `habit.weekdayShort.${d}`)).join(" ");
    default:
      return "";
  }
}
