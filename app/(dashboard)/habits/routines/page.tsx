import { getRoutinesWithStats } from "@/lib/queries/routines";
import { getHabitNames } from "@/lib/queries/habits";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { RoutineForm } from "@/components/habit/routine-form";
import { RutinasClient } from "./routines-client";

export default async function RutinasPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const [routines, habits] = await Promise.all([getRoutinesWithStats(today), getHabitNames()]);

  return (
    <div>
      <RutinasClient routines={routines} habits={habits} />
      <div id="crear-rutina" className="mt-6 scroll-mt-6 border-t border-border pt-5">
        <RoutineForm habits={habits} />
      </div>
    </div>
  );
}
