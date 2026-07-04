import { periodKeyFor } from "./frequency";

export type LogStatus = "done" | "partial" | "missed" | "justified" | "skipped" | "frozen";

/** Comodines de racha disponibles por hábito y por mes calendario. */
export const FREEZE_MONTHLY_ALLOWANCE = 1;

const KEEPS_STREAK_STATUSES = new Set<LogStatus>(["done", "partial", "justified", "skipped", "frozen"]);

type SkipLimitHabit = {
  frequencyType: string;
  frequencyConfig: string | null;
  skipDaysAllowed: number;
  startDate: string;
};

/**
 * Fechas con status "skipped" que exceden skip_days_allowed dentro de su período
 * (semana o mes, según frequency_type). Esos días no deben contar como racha viva
 * ni como cumplimiento, a diferencia de un "skipped" dentro del límite.
 */
export function overLimitSkipDates(
  habit: SkipLimitHabit,
  datesAscending: string[],
  statusByDate: Map<string, string>
): Set<string> {
  const usedPerPeriod = new Map<string, number>();
  const overLimit = new Set<string>();
  for (const date of datesAscending) {
    if (statusByDate.get(date) !== "skipped") continue;
    const period = periodKeyFor(habit, date);
    const used = (usedPerPeriod.get(period) ?? 0) + 1;
    usedPerPeriod.set(period, used);
    if (used > habit.skipDaysAllowed) overLimit.add(date);
  }
  return overLimit;
}

/** ¿Este status en esta fecha mantiene la racha/cumplimiento vivo? */
export function keepsStreakOn(
  status: string | undefined,
  date: string,
  overLimitSkips: Set<string>
): boolean {
  if (!status || !KEEPS_STREAK_STATUSES.has(status as LogStatus)) return false;
  if (status === "skipped" && overLimitSkips.has(date)) return false;
  return true;
}
