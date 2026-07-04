import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { getCategoryStats, getHabitStatCards, getOverallStats, getTrend } from "@/lib/queries/stats";
import { EstadisticasClient } from "./estadisticas-client";

export default async function EstadisticasPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

  const [overall, trend, categories, cards] = await Promise.all([
    getOverallStats(today),
    getTrend(today, 14),
    getCategoryStats(today, 30),
    getHabitStatCards(today),
  ]);

  return (
    <EstadisticasClient overall={overall} trend={trend} categories={categories} cards={cards} />
  );
}
