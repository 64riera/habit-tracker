import { getFocusHistory } from "@/lib/queries/focus";
import { getFocusHistorySummary } from "@/lib/queries/focus-stats";
import { getHabitNames } from "@/lib/queries/habits";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { FocusHistorialClient } from "./historial-client";

const PAGE_SIZE = 20;

export default async function FocusHistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ habit?: string }>;
}) {
  const { habit: habitId } = await searchParams;
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

  const [sessions, summary, habitNames] = await Promise.all([
    getFocusHistory({ habitId, limit: PAGE_SIZE }),
    getFocusHistorySummary(habitId),
    getHabitNames(),
  ]);

  return (
    <FocusHistorialClient
      sessions={sessions}
      summary={summary}
      habitNames={habitNames}
      today={today}
      selectedHabit={habitId ?? ""}
    />
  );
}
