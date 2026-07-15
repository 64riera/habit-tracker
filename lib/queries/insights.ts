import "server-only";
import { cache } from "react";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habits, habitLogs, transactions, gymSessions, focusSessions } from "@/lib/db/schema";
import { addDays } from "@/lib/date";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  buildDailySignals,
  spendByHabitCompletion,
  focusByGymDay,
  habitCompletionByGymDay,
  spendByMood,
  type BucketComparison,
} from "@/lib/insights/compute";

export type CrossDomainInsights = {
  spendByHabitCompletion: BucketComparison;
  focusByGymDay: BucketComparison;
  habitCompletionByGymDay: BucketComparison;
  spendByMood: BucketComparison;
};

/**
 * Correlates habits (+ mood), finance, gym and focus by their shared
 * YYYY-MM-DD `date` column over a trailing window (default 90 days, same as
 * getWorstWeekday/getMoodCorrelation in lib/queries/patterns.ts). Every
 * sub-query here is bounded to that window — deliberately not reusing
 * getTransactions()/getGymSessions() (lib/queries/finance.ts / gym.ts),
 * which fetch a user's entire unfiltered history for their own pages' needs.
 */
export const getCrossDomainInsights = cache(async (today: string, days = 90): Promise<CrossDomainInsights> => {
  const userId = await getCurrentUserId();
  const from = addDays(today, -(days - 1));

  const activeHabits = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.status, "active")));
  const habitIds = activeHabits.map((h) => h.id);

  const [logs, txRows, gymRows, focusRows] = await Promise.all([
    habitIds.length
      ? db
          .select({ habitId: habitLogs.habitId, date: habitLogs.date, status: habitLogs.status, mood: habitLogs.mood })
          .from(habitLogs)
          .where(and(inArray(habitLogs.habitId, habitIds), gte(habitLogs.date, from)))
      : Promise.resolve([]),
    db
      .select({ date: transactions.date, type: transactions.type, amount: transactions.amount })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.date, from))),
    db
      .select({ date: gymSessions.date })
      .from(gymSessions)
      .where(and(eq(gymSessions.userId, userId), gte(gymSessions.date, from))),
    db
      .select({ date: focusSessions.date, accumulatedActiveSeconds: focusSessions.accumulatedActiveSeconds })
      .from(focusSessions)
      .where(
        and(eq(focusSessions.userId, userId), gte(focusSessions.date, from), eq(focusSessions.status, "completed"))
      ),
  ]);

  const signals = buildDailySignals({
    from,
    today,
    activeHabits,
    habitLogs: logs,
    transactions: txRows,
    gymSessionDates: gymRows.map((g) => g.date),
    focusRows,
  });

  return {
    spendByHabitCompletion: spendByHabitCompletion(signals),
    focusByGymDay: focusByGymDay(signals),
    habitCompletionByGymDay: habitCompletionByGymDay(signals),
    spendByMood: spendByMood(signals),
  };
});
