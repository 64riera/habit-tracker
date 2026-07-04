import { translate } from "@/lib/i18n/t";
import { parseFrequencyConfig } from "./frequency";

type FreqHabit = { frequencyType: string; frequencyConfig: string | null };

export function describeFrequency(habit: FreqHabit, dict: unknown): string {
  const cfg = parseFrequencyConfig(habit.frequencyConfig);
  switch (habit.frequencyType) {
    case "daily":
      return translate(dict, "habit.freqShort.daily");
    case "weekdays":
      return (cfg.days ?? [])
        .map((d) => translate(dict, `habit.weekdayShort.${d}`))
        .join(" ");
    case "x_per_week":
      return translate(dict, "habit.freqShort.xPerWeek", { n: cfg.timesPerPeriod ?? 1 });
    case "x_per_month":
      return translate(dict, "habit.freqShort.xPerMonth", { n: cfg.timesPerPeriod ?? 1 });
    case "custom_interval":
      return translate(dict, "habit.freqShort.everyNDays", { n: cfg.intervalDays ?? 1 });
    default:
      return "";
  }
}

export function describeGoal(habit: {
  goalType: string;
  goalTarget: number | null;
  goalUnit: string | null;
}): string {
  if (habit.goalType === "binary" || !habit.goalTarget) return "";
  return `${habit.goalTarget}${habit.goalUnit ? ` ${habit.goalUnit}` : ""}`.trim();
}

export function categoryLabel(categoryId: string | null, dict: unknown): string {
  if (!categoryId) return "";
  return translate(dict, `categories.${categoryId}`) || categoryId;
}
