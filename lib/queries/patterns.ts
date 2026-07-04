import "server-only";
import { and, gte, inArray } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habitLogs, habits } from "@/lib/db/schema";
import { addDays, dateRange, isoWeekday } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";

const MIN_SAMPLES_PER_WEEKDAY = 3;

export type WorstWeekday = { weekday: number; missRate: number } | null;

/** Día ISO (1=lunes..7=domingo) con mayor proporción de hábitos marcados "missed". */
export async function getWorstWeekday(today: string, days = 90): Promise<WorstWeekday> {
  const activeHabits = await db.select().from(habits).where(eq(habits.status, "active"));
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
}

export type MoodCorrelation = {
  lowMoodMissRate: number;
  highMoodMissRate: number;
  sampleSize: number;
} | null;

/** Agregación simple: ¿los registros con ánimo bajo (1-2) fallan más que los de ánimo alto (4-5)? */
export async function getMoodCorrelation(today: string, days = 90): Promise<MoodCorrelation> {
  const from = addDays(today, -(days - 1));
  const logs = await db
    .select({ status: habitLogs.status, mood: habitLogs.mood })
    .from(habitLogs)
    .where(and(gte(habitLogs.date, from)));

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
}
