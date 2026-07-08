import { getCategories, getHabitsForToday } from "@/lib/queries/habits";
import { getRoutinesForToday } from "@/lib/queries/routines";
import { HoyClient } from "./hoy-client";

/** Única parte de Hoy que depende de datos (habits/routines/categories) —
 * separada de page.tsx para poder envolverla en su propio <Suspense>, sin
 * que el header ni el DaySwitcher (que no dependen de esta consulta)
 * desaparezcan mientras carga. */
export async function HoyHabits({ date, today }: { date: string; today: string }) {
  const [habits, routines, categories] = await Promise.all([
    getHabitsForToday(date),
    getRoutinesForToday(date),
    getCategories(),
  ]);

  return <HoyClient habits={habits} routines={routines} date={date} today={today} categories={categories} />;
}
