import "server-only";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habitLogs, habits, routines } from "@/lib/db/schema";
import { addDays, dateRange } from "@/lib/date";
import { isDateApplicable } from "@/lib/habits/frequency";
import { overLimitSkipDates, keepsStreakOn } from "@/lib/habits/status";
import { getCurrentUserId } from "@/lib/auth/session";
import type { HabitRow } from "@/lib/queries/habits";

export type RoutineRow = typeof routines.$inferSelect;

export type RoutineHabitSummary = {
  id: string;
  name: string;
  goalType: HabitRow["goalType"];
  goalTarget: number | null;
};

export type RoutineWithHabits = Omit<RoutineRow, "habitIds"> & {
  habitIds: string[];
  habits: RoutineHabitSummary[];
};

const KEEPS_STREAK_STATUSES = new Set(["done", "partial", "justified", "skipped", "frozen"]);

function parseHabitIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function getRoutines(): Promise<RoutineWithHabits[]> {
  const userId = await getCurrentUserId();
  const rows = await db
    .select()
    .from(routines)
    .where(eq(routines.userId, userId))
    .orderBy(routines.sortOrder);
  if (rows.length === 0) return [];

  const allHabitIds = Array.from(new Set(rows.flatMap((r) => parseHabitIds(r.habitIds))));
  const habitRows = allHabitIds.length
    ? await db
        .select({ id: habits.id, name: habits.name, goalType: habits.goalType, goalTarget: habits.goalTarget })
        .from(habits)
        .where(inArray(habits.id, allHabitIds))
    : [];
  const habitById = new Map(habitRows.map((h) => [h.id, h]));

  return rows.map((r) => {
    const ids = parseHabitIds(r.habitIds);
    return {
      ...r,
      habitIds: ids,
      habits: ids.map((id) => habitById.get(id)).filter((h): h is RoutineHabitSummary => !!h),
    };
  });
}

export type RoutineToday = RoutineWithHabits & { doneToday: number; totalToday: number };

/** Routines with active habits and how many are already checked today, for the quick tap on Home. */
export async function getRoutinesForToday(date: string): Promise<RoutineToday[]> {
  const base = (await getRoutines()).filter((r) => r.habits.length > 0);
  if (base.length === 0) return [];

  const allHabitIds = Array.from(new Set(base.flatMap((r) => r.habitIds)));
  const logs = await db
    .select({ habitId: habitLogs.habitId, status: habitLogs.status })
    .from(habitLogs)
    .where(and(inArray(habitLogs.habitId, allHabitIds), eq(habitLogs.date, date)));
  const statusById = new Map(logs.map((l) => [l.habitId, l.status]));

  return base.map((r) => ({
    ...r,
    totalToday: r.habits.length,
    doneToday: r.habits.filter((h) => {
      const status = statusById.get(h.id);
      return !!status && KEEPS_STREAK_STATUSES.has(status);
    }).length,
  }));
}

export type RoutineWithStats = RoutineWithHabits & { completionPct30: number };

/** Routine completion as a whole: % of days (last 30) where ALL of its habits were kept. */
export async function getRoutinesWithStats(today: string): Promise<RoutineWithStats[]> {
  const base = await getRoutines();
  if (base.length === 0) return [];

  const from = addDays(today, -29);
  const allHabitIds = Array.from(new Set(base.flatMap((r) => r.habitIds)));
  const habitRows = allHabitIds.length
    ? await db.select().from(habits).where(inArray(habits.id, allHabitIds))
    : [];
  const habitById = new Map(habitRows.map((h) => [h.id, h]));

  const logs = allHabitIds.length
    ? await db
        .select({ habitId: habitLogs.habitId, date: habitLogs.date, status: habitLogs.status })
        .from(habitLogs)
        .where(and(inArray(habitLogs.habitId, allHabitIds), gte(habitLogs.date, from)))
    : [];

  const byHabit = new Map<string, Map<string, string>>();
  for (const log of logs) {
    if (!byHabit.has(log.habitId)) byHabit.set(log.habitId, new Map());
    byHabit.get(log.habitId)!.set(log.date, log.status);
  }

  const overLimitByHabit = new Map<string, Set<string>>();
  for (const h of habitRows) {
    const statusByDate = byHabit.get(h.id) ?? new Map();
    const applicable = dateRange(from, today).filter((d) => isDateApplicable(h, d));
    overLimitByHabit.set(h.id, overLimitSkipDates(h, applicable, statusByDate));
  }

  return base.map((r) => {
    const memberHabits = r.habitIds
      .map((id) => habitById.get(id))
      .filter((h): h is HabitRow => !!h);

    let fullyCompletedDays = 0;
    let applicableDays = 0;
    for (const date of dateRange(from, today)) {
      const applicableMembers = memberHabits.filter((h) => isDateApplicable(h, date));
      if (applicableMembers.length === 0) continue;
      applicableDays += 1;
      const allKept = applicableMembers.every((h) => {
        const statusByDate = byHabit.get(h.id) ?? new Map();
        return keepsStreakOn(statusByDate.get(date), date, overLimitByHabit.get(h.id)!);
      });
      if (allKept) fullyCompletedDays += 1;
    }

    return {
      ...r,
      completionPct30: applicableDays > 0 ? Math.round((fullyCompletedDays / applicableDays) * 100) : 0,
    };
  });
}
