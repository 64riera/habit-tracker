import { getCategories, getHabitsForToday } from "@/lib/queries/habits";
import { getRoutinesForToday } from "@/lib/queries/routines";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { HoyClient } from "./hoy-client";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Solo se puede ver/registrar hoy o un día anterior — nunca el futuro. Una
 * fecha inválida o futura en el query cae de vuelta a hoy en silencio, en
 * vez de propagar el valor sucio hacia las queries. */
function resolveViewedDate(requested: string | undefined, today: string): string {
  if (requested && ISO_DATE.test(requested) && requested <= today) return requested;
  return today;
}

export default async function HoyPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha } = await searchParams;
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const date = resolveViewedDate(fecha, today);
  const [habits, routines, categories] = await Promise.all([
    getHabitsForToday(date),
    getRoutinesForToday(date),
    getCategories(),
  ]);

  return (
    <HoyClient habits={habits} routines={routines} date={date} today={today} categories={categories} />
  );
}
