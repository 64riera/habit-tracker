import { getCategories, getHabitsForToday } from "@/lib/queries/habits";
import { getRoutinesForToday } from "@/lib/queries/routines";
import { TodayClient } from "./today-client";

/** The only part of Home that depends on data (habits/routines/categories) —
 * split out from page.tsx so it can be wrapped in its own <Suspense>,
 * without the header or the DaySwitcher (which don't depend on this
 * query) disappearing while it loads. */
export async function TodayHabits({ date, today }: { date: string; today: string }) {
  const [habits, routines, categories] = await Promise.all([
    getHabitsForToday(date),
    getRoutinesForToday(date),
    getCategories(),
  ]);

  return <TodayClient habits={habits} routines={routines} date={date} today={today} categories={categories} />;
}
