import { addDays, daysBetween, dateRange, startOfMonth, startOfWeek } from "@/lib/date";
import type { GymSessionRow } from "@/lib/queries/gym";
import type { GymSet } from "@/lib/gym/types";

/**
 * Pure — safe to run on the client over the whole session list already
 * loaded by /gym (see getGymSessions), same reasoning as
 * lib/finance/aggregate.ts: no separate stats query, so this works offline
 * for free and every view is just a different reduce over data that's
 * already there.
 */

/** Parses a free-text weight ("12.5", or "43+5" for a machine's stack plus
 * an add-on plate) into a single number for aggregate stats — sums
 * "+"-separated parts, and is `null` (not 0) for anything not resolvable
 * to a number, including bodyweight sets with no weight at all, so
 * callers can tell "no weight" from "zero". */
export function parseWeight(weight?: string): number | null {
  if (!weight) return null;
  const parts = weight.split("+").map((p) => Number(p.trim()));
  if (parts.length === 0 || parts.some((p) => !Number.isFinite(p))) return null;
  const total = parts.reduce((sum, p) => sum + p, 0);
  return total > 0 ? total : null;
}

function setVolume(set: GymSet): number {
  const weight = parseWeight(set.weight);
  return weight === null ? 0 : weight * set.reps;
}

/** Weight × reps summed over every set — bodyweight sets (no parseable
 * weight) contribute 0, the standard "volume load" convention. */
export function sessionVolume(session: GymSessionRow): number {
  return session.exercises.reduce((sum, e) => sum + e.sets.reduce((s, set) => s + setVolume(set), 0), 0);
}

export function sessionSetCount(session: GymSessionRow): number {
  return session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
}

export function filterByRange(sessions: GymSessionRow[], from: string, to: string): GymSessionRow[] {
  return sessions.filter((s) => s.date >= from && s.date <= to);
}

export type GymPeriodSummary = { sessionCount: number; setCount: number; volume: number };

export function summarizeSessions(sessions: GymSessionRow[]): GymPeriodSummary {
  return {
    sessionCount: sessions.length,
    setCount: sessions.reduce((sum, s) => sum + sessionSetCount(s), 0),
    volume: Math.round(sessions.reduce((sum, s) => sum + sessionVolume(s), 0)),
  };
}

export type GymPeriodComparison = { current: GymPeriodSummary; previous: GymPeriodSummary; volumeChange: number };

/** Same shifting logic as getFocusWeekSummary/getFocusMonthSummary in
 * lib/queries/focus-stats.ts, generalized as a pure helper instead of a
 * query (see module comment) and parameterized by the period's own start
 * function, so week/month don't need near-duplicate bodies. */
function periodComparison(
  sessions: GymSessionRow[],
  today: string,
  startOfPeriod: (date: string) => string
): GymPeriodComparison {
  const start = startOfPeriod(today);
  const current = summarizeSessions(filterByRange(sessions, start, today));
  const prevEnd = addDays(start, -1);
  const prevStart = startOfPeriod(prevEnd);
  const previous = summarizeSessions(filterByRange(sessions, prevStart, prevEnd));
  return { current, previous, volumeChange: current.volume - previous.volume };
}

export function getGymWeekSummary(sessions: GymSessionRow[], today: string): GymPeriodComparison {
  return periodComparison(sessions, today, startOfWeek);
}

export function getGymMonthSummary(sessions: GymSessionRow[], today: string): GymPeriodComparison {
  return periodComparison(sessions, today, startOfMonth);
}

export type GymOverallTotals = { sessions7: number; sessions30: number; sessions90: number };

export function overallSessionCounts(sessions: GymSessionRow[], today: string): GymOverallTotals {
  const from90 = addDays(today, -89);
  const from30 = addDays(today, -29);
  const from7 = addDays(today, -6);
  let sessions7 = 0;
  let sessions30 = 0;
  let sessions90 = 0;
  for (const s of sessions) {
    if (s.date < from90 || s.date > today) continue;
    sessions90++;
    if (s.date >= from30) sessions30++;
    if (s.date >= from7) sessions7++;
  }
  return { sessions7, sessions30, sessions90 };
}

export type GymTrendPoint = { date: string; volume: number };

export function gymTrend(sessions: GymSessionRow[], today: string, days = 30): GymTrendPoint[] {
  const from = addDays(today, -(days - 1));
  const volumeByDate = new Map<string, number>();
  for (const s of filterByRange(sessions, from, today)) {
    volumeByDate.set(s.date, (volumeByDate.get(s.date) ?? 0) + sessionVolume(s));
  }
  return dateRange(from, today).map((date) => ({ date, volume: Math.round(volumeByDate.get(date) ?? 0) }));
}

export type GymExerciseStat = {
  name: string;
  sessionCount: number;
  setCount: number;
  volume: number;
  bestWeight: number | null;
  bestReps: number;
};

/** Aggregates by a trimmed/lowercased key (so "Press militar" and "press
 * militar " count as the same exercise) but keeps the first-seen casing
 * for display — free-text entry means small typing inconsistencies are
 * expected, and this is cheap insurance against fragmenting the same
 * exercise into lookalike entries. */
export function exerciseBreakdown(sessions: GymSessionRow[]): GymExerciseStat[] {
  const byKey = new Map<
    string,
    { name: string; sessionIds: Set<string>; setCount: number; volume: number; bestWeight: number | null; bestReps: number }
  >();
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const key = exercise.name.trim().toLowerCase();
      if (!key) continue;
      const entry = byKey.get(key) ?? {
        name: exercise.name.trim(),
        sessionIds: new Set<string>(),
        setCount: 0,
        volume: 0,
        bestWeight: null as number | null,
        bestReps: 0,
      };
      entry.sessionIds.add(session.id);
      for (const set of exercise.sets) {
        entry.setCount += 1;
        entry.volume += setVolume(set);
        const weight = parseWeight(set.weight);
        if (weight !== null && (entry.bestWeight === null || weight > entry.bestWeight)) entry.bestWeight = weight;
        entry.bestReps = Math.max(entry.bestReps, set.reps);
      }
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()]
    .map((v) => ({
      name: v.name,
      sessionCount: v.sessionIds.size,
      setCount: v.setCount,
      volume: Math.round(v.volume),
      bestWeight: v.bestWeight,
      bestReps: v.bestReps,
    }))
    .sort((a, b) => b.setCount - a.setCount);
}

export type GymStreak = { current: number; longest: number };

/** Consecutive Mon–Sun weeks with at least one session, ending at the
 * current week. Week-based (not day-based like habit streaks): lifting
 * every single day isn't the goal or even advisable, so a day streak would
 * reset on every planned rest day — a week streak instead rewards
 * "trained at least once this week", which is how lifters actually track
 * consistency. */
export function gymStreak(sessions: GymSessionRow[], today: string): GymStreak {
  const weeksWithSession = new Set(sessions.map((s) => startOfWeek(s.date)));
  const currentWeekStart = startOfWeek(today);

  let current = 0;
  // An in-progress week with no session yet isn't a broken streak — it
  // just hasn't happened. Only start counting from last week in that case.
  let cursor = weeksWithSession.has(currentWeekStart) ? currentWeekStart : addDays(currentWeekStart, -7);
  while (weeksWithSession.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -7);
  }

  const sortedWeeks = [...weeksWithSession].sort();
  let longest = 0;
  let run = 0;
  let prevWeek: string | null = null;
  for (const week of sortedWeeks) {
    run = prevWeek && daysBetween(prevWeek, week) === 7 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prevWeek = week;
  }
  return { current, longest: Math.max(longest, current) };
}
