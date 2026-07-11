import { periodKeyFor } from "./frequency";

export type LogStatus = "done" | "partial" | "missed" | "justified" | "skipped" | "frozen";

/** Streak freezes available per habit, per calendar month. */
export const FREEZE_MONTHLY_ALLOWANCE = 1;

const KEEPS_STREAK_STATUSES = new Set<LogStatus>(["done", "partial", "justified", "skipped", "frozen"]);

type SkipLimitHabit = {
  frequencyType: string;
  frequencyConfig: string | null;
  skipDaysAllowed: number;
  startDate: string;
};

/**
 * Dates with status "skipped" that exceed skip_days_allowed within their
 * period (week or month, depending on frequency_type). Those days must not
 * count toward a live streak or completion, unlike a "skipped" within the
 * limit.
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

/** Does this status on this date keep the streak/completion alive? */
export function keepsStreakOn(
  status: string | undefined,
  date: string,
  overLimitSkips: Set<string>
): boolean {
  if (!status || !KEEPS_STREAK_STATUSES.has(status as LogStatus)) return false;
  if (status === "skipped" && overLimitSkips.has(date)) return false;
  return true;
}
