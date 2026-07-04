import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habitLogs, habits } from "@/lib/db/schema";
import { dateRange, addDays, isoWeekday, startOfWeek } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";
import { overLimitSkipDates, keepsStreakOn } from "@/lib/habits/status";

export type HistoryFilters = { habitId?: string; categoryId?: string };

export type DayCell = {
  date: string;
  /** 0 (sin datos) a 4 (cumplimiento total) */
  level: 0 | 1 | 2 | 3 | 4;
  status?: string;
  /** true si todo lo cumplido ese día fue justified/skipped/frozen (nada realmente "done") */
  allJustified: boolean;
};

async function getApplicableHabits(filters: HistoryFilters) {
  const all = await db.select().from(habits);
  return all.filter((h) => {
    if (filters.habitId && h.id !== filters.habitId) return false;
    if (filters.categoryId && h.categoryId !== filters.categoryId) return false;
    return true;
  });
}

/** Genera niveles de cumplimiento por día para el heatmap, opcionalmente filtrado. */
export async function getHeatmapRange(
  from: string,
  to: string,
  filters: HistoryFilters = {}
): Promise<DayCell[]> {
  const relevantHabits = await getApplicableHabits(filters);
  const habitIds = relevantHabits.map((h) => h.id);

  const logs = habitIds.length
    ? await db
        .select({ habitId: habitLogs.habitId, date: habitLogs.date, status: habitLogs.status })
        .from(habitLogs)
        .where(and(inArray(habitLogs.habitId, habitIds), gte(habitLogs.date, from)))
    : [];

  const byDate = new Map<string, { habitId: string; status: string }[]>();
  const byHabit = new Map<string, Map<string, string>>();
  for (const log of logs) {
    const arr = byDate.get(log.date) ?? [];
    arr.push(log);
    byDate.set(log.date, arr);

    if (!byHabit.has(log.habitId)) byHabit.set(log.habitId, new Map());
    byHabit.get(log.habitId)!.set(log.date, log.status);
  }

  const overLimitByHabit = new Map<string, Set<string>>();
  for (const h of relevantHabits) {
    const statusByDate = byHabit.get(h.id) ?? new Map();
    const applicableForHabit = dateRange(from, to).filter((d) => isDateApplicable(h, d));
    overLimitByHabit.set(h.id, overLimitSkipDates(h, applicableForHabit, statusByDate));
  }

  return dateRange(from, to).map((date) => {
    const applicable = relevantHabits.filter((h) => isDateApplicable(h, date));
    if (applicable.length === 0) return { date, level: 0 as const, allJustified: false };

    const logsForDate = byDate.get(date) ?? [];
    const statusByHabitToday = new Map(logsForDate.map((l) => [l.habitId, l.status]));
    const keptHabits = applicable.filter((h) =>
      keepsStreakOn(statusByHabitToday.get(h.id), date, overLimitByHabit.get(h.id)!)
    );

    const ratio = keptHabits.length / applicable.length;
    let level: DayCell["level"] = 0;
    if (ratio >= 1) level = 4;
    else if (ratio >= 0.66) level = 3;
    else if (ratio >= 0.33) level = 2;
    else if (ratio > 0) level = 1;

    const allJustified =
      keptHabits.length > 0 &&
      keptHabits.every((h) => {
        const s = statusByHabitToday.get(h.id);
        return s === "justified" || s === "skipped" || s === "frozen";
      });

    const singleStatus =
      filters.habitId && logsForDate[0] ? logsForDate[0].status : undefined;

    return { date, level, status: singleStatus, allJustified };
  });
}

export type CalendarCell = {
  date: string;
  inMonth: boolean;
  level: DayCell["level"];
  isToday: boolean;
  allJustified: boolean;
};

export async function getCalendarMonth(
  monthStart: string,
  today: string,
  filters: HistoryFilters = {}
): Promise<CalendarCell[]> {
  const monthDate = new Date(monthStart);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastDay = `${monthStart.slice(0, 8)}${String(daysInMonth).padStart(2, "0")}`;
  const monthEnd = lastDay;

  const gridStart = startOfWeek(monthStart);
  const gridEnd = addDays(lastDay, (7 - isoWeekday(lastDay)) % 7);

  const heat = await getHeatmapRange(gridStart, gridEnd, filters);
  const heatByDate = new Map(heat.map((h) => [h.date, h]));

  return dateRange(gridStart, gridEnd).map((date) => ({
    date,
    inMonth: date >= monthStart && date <= monthEnd,
    level: heatByDate.get(date)?.level ?? 0,
    isToday: date === today,
    allJustified: heatByDate.get(date)?.allJustified ?? false,
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

export async function getRecentLog(
  limit: number,
  filters: HistoryFilters = {},
  offset = 0
): Promise<LogEntry[]> {
  const conditions = [];
  if (filters.habitId) conditions.push(eq(habitLogs.habitId, filters.habitId));
  if (filters.categoryId) conditions.push(eq(habits.categoryId, filters.categoryId));

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
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(habitLogs.date), desc(habitLogs.loggedAt))
    .limit(limit)
    .offset(offset);

  return rows;
}
