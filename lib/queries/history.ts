import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habitLogs, habits } from "@/lib/db/schema";
import { dateRange, addDays, isoWeekday, startOfWeek } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";

export type DayCell = {
  date: string;
  /** 0 (sin datos) a 4 (cumplimiento total) */
  level: 0 | 1 | 2 | 3 | 4;
  status?: string;
};

const KEEPS_STREAK = new Set(["done", "partial", "justified", "skipped", "frozen"]);

async function getApplicableHabits(habitId?: string) {
  const all = await db.select().from(habits);
  return habitId ? all.filter((h) => h.id === habitId) : all;
}

/** Genera niveles de cumplimiento por día para el heatmap, opcionalmente filtrado a un hábito. */
export async function getHeatmapRange(
  from: string,
  to: string,
  habitId?: string
): Promise<DayCell[]> {
  const relevantHabits = await getApplicableHabits(habitId);
  const habitIds = relevantHabits.map((h) => h.id);

  const logs = habitIds.length
    ? await db
        .select({ habitId: habitLogs.habitId, date: habitLogs.date, status: habitLogs.status })
        .from(habitLogs)
        .where(and(inArray(habitLogs.habitId, habitIds), gte(habitLogs.date, from)))
    : [];

  const byDate = new Map<string, { habitId: string; status: string }[]>();
  for (const log of logs) {
    const arr = byDate.get(log.date) ?? [];
    arr.push(log);
    byDate.set(log.date, arr);
  }

  return dateRange(from, to).map((date) => {
    const applicable = relevantHabits.filter((h) => isDateApplicable(h, date));
    if (applicable.length === 0) return { date, level: 0 as const };

    const logsForDate = byDate.get(date) ?? [];
    const statusByHabit = new Map(logsForDate.map((l) => [l.habitId, l.status]));
    const kept = applicable.filter((h) => {
      const s = statusByHabit.get(h.id);
      return s && KEEPS_STREAK.has(s);
    }).length;

    const ratio = kept / applicable.length;
    let level: DayCell["level"] = 0;
    if (ratio >= 1) level = 4;
    else if (ratio >= 0.66) level = 3;
    else if (ratio >= 0.33) level = 2;
    else if (ratio > 0) level = 1;

    const singleStatus =
      habitId && logsForDate[0] ? logsForDate[0].status : undefined;

    return { date, level, status: singleStatus };
  });
}

export type CalendarCell = { date: string; inMonth: boolean; level: DayCell["level"]; isToday: boolean };

export async function getCalendarMonth(
  monthStart: string,
  today: string,
  habitId?: string
): Promise<CalendarCell[]> {
  const monthDate = new Date(monthStart);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastDay = `${monthStart.slice(0, 8)}${String(daysInMonth).padStart(2, "0")}`;
  const monthEnd = lastDay;

  const gridStart = startOfWeek(monthStart);
  const gridEnd = addDays(lastDay, (7 - isoWeekday(lastDay)) % 7);

  const heat = await getHeatmapRange(gridStart, gridEnd, habitId);
  const heatByDate = new Map(heat.map((h) => [h.date, h]));

  return dateRange(gridStart, gridEnd).map((date) => ({
    date,
    inMonth: date >= monthStart && date <= monthEnd,
    level: heatByDate.get(date)?.level ?? 0,
    isToday: date === today,
  }));
}

export type LogEntry = {
  id: string;
  date: string;
  habitId: string;
  habitName: string;
  status: string;
  note: string | null;
  mood: number | null;
  value: number | null;
};

export async function getRecentLog(limit: number, habitId?: string): Promise<LogEntry[]> {
  const rows = await db
    .select({
      id: habitLogs.id,
      date: habitLogs.date,
      habitId: habitLogs.habitId,
      status: habitLogs.status,
      note: habitLogs.note,
      mood: habitLogs.mood,
      value: habitLogs.value,
      habitName: habits.name,
    })
    .from(habitLogs)
    .innerJoin(habits, eq(habits.id, habitLogs.habitId))
    .where(habitId ? eq(habitLogs.habitId, habitId) : undefined)
    .orderBy(desc(habitLogs.date), desc(habitLogs.loggedAt))
    .limit(limit);

  return rows;
}
