import { addDays, parseISODate, toISODate } from "@/lib/date";

export type RecurringRuleLike = {
  recurrenceType: "monthly" | "yearly";
  /** 1-31, clamped to the last day of shorter months (or Feb outside a
   * leap year) instead of skipping the period entirely. */
  dayOfMonth: number;
  /** 1-12, only meaningful when recurrenceType is "yearly". */
  month: number | null;
  startDate: string;
  lastGeneratedDate: string | null;
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampedDate(year: number, month: number, dayOfMonth: number): string {
  const day = Math.min(dayOfMonth, daysInMonth(year, month));
  return toISODate(new Date(year, month - 1, day));
}

/** Every date in [from, to] (inclusive) where `rule` is due. Both cadences
 * clamp to the last valid day of the period when the configured day
 * doesn't exist in it (day 31 in a 30-day month, Feb 29 outside a leap
 * year) rather than skipping that period — a rent due "the 31st" still
 * charges once in April, just on the 30th. */
export function occurrencesInRange(rule: RecurringRuleLike, from: string, to: string): string[] {
  if (from > to) return [];
  const fromDate = parseISODate(from);
  const toDate = parseISODate(to);
  const occurrences: string[] = [];

  if (rule.recurrenceType === "monthly") {
    let year = fromDate.getFullYear();
    let month = fromDate.getMonth() + 1;
    const endYear = toDate.getFullYear();
    const endMonth = toDate.getMonth() + 1;
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const occurrence = clampedDate(year, month, rule.dayOfMonth);
      if (occurrence >= from && occurrence <= to) occurrences.push(occurrence);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  } else {
    const targetMonth = rule.month ?? 1;
    let year = fromDate.getFullYear();
    const endYear = toDate.getFullYear();
    while (year <= endYear) {
      const occurrence = clampedDate(year, targetMonth, rule.dayOfMonth);
      if (occurrence >= from && occurrence <= to) occurrences.push(occurrence);
      year += 1;
    }
  }

  return occurrences;
}

/** The occurrences a rule still needs materialized as of `today` — the scan
 * window starts the day after lastGeneratedDate (already processed) or at
 * startDate if it's never run. Never starts before startDate even if
 * lastGeneratedDate somehow predates it, since a rule can't generate
 * transactions from before it existed. */
export function dueOccurrences(rule: RecurringRuleLike, today: string): string[] {
  const from =
    rule.lastGeneratedDate && rule.lastGeneratedDate >= rule.startDate
      ? addDays(rule.lastGeneratedDate, 1)
      : rule.startDate;
  if (from > today) return [];
  return occurrencesInRange(rule, from, today);
}
