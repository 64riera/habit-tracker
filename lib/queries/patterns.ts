import "server-only";
import { cache } from "react";
import { and, gte, inArray } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habitLogs, habits } from "@/lib/db/schema";
import { addDays, dateRange, isoWeekday } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";
import { getCurrentUserId } from "@/lib/auth/session";

const MIN_SAMPLES_PER_WEEKDAY = 3;

export type WorstWeekday = { weekday: number; missRate: number } | null;

/** ISO weekday (1=Monday..7=Sunday) with the highest proportion of habits marked "missed". */
export const getWorstWeekday = cache(async (today: string, days = 90): Promise<WorstWeekday> => {
  const userId = await getCurrentUserId();
  const activeHabits = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.status, "active")));
  const ids = activeHabits.map((h) => h.id);
  const from = addDays(today, -(days - 1));
  const logs = ids.length
    ? await db
        .select({ habitId: habitLogs.habitId, date: habitLogs.date, status: habitLogs.status })
        .from(habitLogs)
        .where(and(inArray(habitLogs.habitId, ids), gte(habitLogs.date, from)))
    : [];

  const byHabit = new Map<string, Map<string, string>>();
  for (const log of logs) {
    if (!byHabit.has(log.habitId)) byHabit.set(log.habitId, new Map());
    byHabit.get(log.habitId)!.set(log.date, log.status);
  }

  const applicableByWeekday = new Map<number, number>();
  const missedByWeekday = new Map<number, number>();

  for (const h of activeHabits) {
    const start = h.startDate > from ? h.startDate : from;
    if (start > today) continue;
    const statusByDate = byHabit.get(h.id) ?? new Map();
    for (const date of dateRange(start, today)) {
      if (!isDateApplicable(h, date)) continue;
      const weekday = isoWeekday(date);
      applicableByWeekday.set(weekday, (applicableByWeekday.get(weekday) ?? 0) + 1);
      if (statusByDate.get(date) === "missed") {
        missedByWeekday.set(weekday, (missedByWeekday.get(weekday) ?? 0) + 1);
      }
    }
  }

  let worst: WorstWeekday = null;
  for (const [weekday, applicable] of applicableByWeekday) {
    if (applicable < MIN_SAMPLES_PER_WEEKDAY) continue;
    const missRate = (missedByWeekday.get(weekday) ?? 0) / applicable;
    if (!worst || missRate > worst.missRate) worst = { weekday, missRate };
  }
  return worst && worst.missRate > 0 ? worst : null;
});

export type MoodCorrelation = {
  lowMoodMissRate: number;
  highMoodMissRate: number;
  sampleSize: number;
} | null;

/** Simple aggregation: do low-mood entries (1-2) miss more often than high-mood ones (4-5)? */
export const getMoodCorrelation = cache(async (today: string, days = 90): Promise<MoodCorrelation> => {
  const userId = await getCurrentUserId();
  const from = addDays(today, -(days - 1));
  const logs = await db
    .select({ status: habitLogs.status, mood: habitLogs.mood })
    .from(habitLogs)
    .where(and(eq(habitLogs.userId, userId), gte(habitLogs.date, from)));

  const withMood = logs.filter((l) => l.mood !== null) as { status: string; mood: number }[];
  const low = withMood.filter((l) => l.mood <= 2);
  const high = withMood.filter((l) => l.mood >= 4);
  if (low.length < MIN_SAMPLES_PER_WEEKDAY || high.length < MIN_SAMPLES_PER_WEEKDAY) return null;

  const missRate = (arr: { status: string }[]) =>
    Math.round((arr.filter((l) => l.status === "missed").length / arr.length) * 100);

  return {
    lowMoodMissRate: missRate(low),
    highMoodMissRate: missRate(high),
    sampleSize: withMood.length,
  };
});
