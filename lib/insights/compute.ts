import type { HabitRow } from "@/lib/streaks/compute";
import { dateRange } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";
import { overLimitSkipDates, keepsStreakOn } from "@/lib/habits/status";

const MIN_SAMPLES = 3;

export type DailySignal = {
  date: string;
  /** applicable-habit completion rate for the day, 0..1 — null if no active habit was applicable that day. */
  habitCompletionRate: number | null;
  /** average of that day's non-null habitLogs.mood entries — null if none were logged. */
  avgMood: number | null;
  /** sum of expense transactions for the day (0 if none). */
  totalSpend: number;
  /** sum of completed focus sessions' active minutes for the day (0 if none). */
  focusMinutes: number;
  hadGymSession: boolean;
};

/**
 * Per-day habit completion tally across every active habit, same loop shape
 * as getWorstWeekday (lib/queries/patterns.ts) — each habit contributes to
 * only the dates it's applicable on, respecting its own skip-day limit.
 */
function habitCompletionByDate(
  activeHabits: HabitRow[],
  logs: { habitId: string; date: string; status: string }[],
  from: string,
  today: string
): Map<string, { done: number; applicable: number }> {
  const byHabit = new Map<string, Map<string, string>>();
  for (const log of logs) {
    if (!byHabit.has(log.habitId)) byHabit.set(log.habitId, new Map());
    byHabit.get(log.habitId)!.set(log.date, log.status);
  }

  const tally = new Map<string, { done: number; applicable: number }>();
  for (const habit of activeHabits) {
    const start = habit.startDate > from ? habit.startDate : from;
    if (start > today) continue;
    const applicableDates = dateRange(start, today).filter((d) => isDateApplicable(habit, d));
    const statusByDate = byHabit.get(habit.id) ?? new Map();
    const overLimit = overLimitSkipDates(habit, applicableDates, statusByDate);

    for (const date of applicableDates) {
      const entry = tally.get(date) ?? { done: 0, applicable: 0 };
      entry.applicable += 1;
      if (keepsStreakOn(statusByDate.get(date), date, overLimit)) entry.done += 1;
      tally.set(date, entry);
    }
  }
  return tally;
}

function sumByDate<T>(rows: T[], dateOf: (row: T) => string, valueOf: (row: T) => number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const date = dateOf(row);
    totals.set(date, (totals.get(date) ?? 0) + valueOf(row));
  }
  return totals;
}

function avgByDate<T>(rows: T[], dateOf: (row: T) => string, valueOf: (row: T) => number | null): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const value = valueOf(row);
    if (value === null) continue;
    const date = dateOf(row);
    const entry = sums.get(date) ?? { total: 0, count: 0 };
    entry.total += value;
    entry.count += 1;
    sums.set(date, entry);
  }
  const averages = new Map<string, number>();
  for (const [date, { total, count }] of sums) averages.set(date, total / count);
  return averages;
}

/**
 * Merges the four domains' raw rows (already scoped to [from, today] and to
 * the current user) into one per-day array, keyed by the same YYYY-MM-DD
 * `date` string every domain table already stores. Pure — no I/O.
 */
export function buildDailySignals(params: {
  from: string;
  today: string;
  activeHabits: HabitRow[];
  habitLogs: { habitId: string; date: string; status: string; mood: number | null }[];
  transactions: { date: string; type: "income" | "expense"; amount: number }[];
  gymSessionDates: string[];
  focusRows: { date: string; accumulatedActiveSeconds: number }[];
}): DailySignal[] {
  const { from, today, activeHabits, habitLogs, transactions, gymSessionDates, focusRows } = params;

  const completion = habitCompletionByDate(activeHabits, habitLogs, from, today);
  const mood = avgByDate(habitLogs, (l) => l.date, (l) => l.mood);
  const spend = sumByDate(
    transactions.filter((t) => t.type === "expense"),
    (t) => t.date,
    (t) => t.amount
  );
  const focus = sumByDate(focusRows, (r) => r.date, (r) => r.accumulatedActiveSeconds / 60);
  const gymDays = new Set(gymSessionDates);

  return dateRange(from, today).map((date) => {
    const dayCompletion = completion.get(date);
    return {
      date,
      habitCompletionRate: dayCompletion ? dayCompletion.done / dayCompletion.applicable : null,
      avgMood: mood.get(date) ?? null,
      totalSpend: spend.get(date) ?? 0,
      focusMinutes: focus.get(date) ?? 0,
      hadGymSession: gymDays.has(date),
    };
  });
}

export type BucketComparison = { aAvg: number; bAvg: number; aSamples: number; bSamples: number } | null;

/**
 * Shared bucket-comparison engine: splits `signals` into two independent
 * buckets (not necessarily complementary — see the mood/completion-rate
 * "extremes only" insights below) and averages `metric` within each,
 * requiring at least `minSamples` valid (non-null) readings per side. One
 * algorithm reused by every named insight below instead of repeating the
 * filter+average+guard for each (same MIN_SAMPLES convention as
 * lib/queries/patterns.ts's MIN_SAMPLES_PER_WEEKDAY).
 */
export function compareDailyMetric(
  signals: DailySignal[],
  bucketA: (s: DailySignal) => boolean,
  bucketB: (s: DailySignal) => boolean,
  metric: (s: DailySignal) => number | null,
  minSamples = MIN_SAMPLES
): BucketComparison {
  const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
  const valuesIn = (bucket: (s: DailySignal) => boolean) =>
    signals.filter(bucket).map(metric).filter((v): v is number => v !== null);

  const aValues = valuesIn(bucketA);
  const bValues = valuesIn(bucketB);
  if (aValues.length < minSamples || bValues.length < minSamples) return null;

  return { aAvg: average(aValues), bAvg: average(bValues), aSamples: aValues.length, bSamples: bValues.length };
}

const isHighCompletionDay = (s: DailySignal) => s.habitCompletionRate !== null && s.habitCompletionRate >= 0.8;
const isLowCompletionDay = (s: DailySignal) => s.habitCompletionRate !== null && s.habitCompletionRate < 0.5;
const isGymDay = (s: DailySignal) => s.hadGymSession;
const isNonGymDay = (s: DailySignal) => !s.hadGymSession;
const isLowMoodDay = (s: DailySignal) => s.avgMood !== null && s.avgMood <= 2;
const isHighMoodDay = (s: DailySignal) => s.avgMood !== null && s.avgMood >= 4;

/** Average daily spend on days with ≥80% habit completion vs. days with <50%. */
export function spendByHabitCompletion(signals: DailySignal[]): BucketComparison {
  return compareDailyMetric(signals, isHighCompletionDay, isLowCompletionDay, (s) => s.totalSpend);
}

/** Average daily focus minutes on gym days vs. non-gym days. */
export function focusByGymDay(signals: DailySignal[]): BucketComparison {
  return compareDailyMetric(signals, isGymDay, isNonGymDay, (s) => s.focusMinutes);
}

/** Average habit-completion rate on gym days vs. non-gym days. */
export function habitCompletionByGymDay(signals: DailySignal[]): BucketComparison {
  return compareDailyMetric(signals, isGymDay, isNonGymDay, (s) => s.habitCompletionRate);
}

/** Average daily spend on low-mood days (≤2) vs. high-mood days (≥4). */
export function spendByMood(signals: DailySignal[]): BucketComparison {
  return compareDailyMetric(signals, isLowMoodDay, isHighMoodDay, (s) => s.totalSpend);
}
