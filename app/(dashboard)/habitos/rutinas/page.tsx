import { getRoutinesWithStats } from "@/lib/queries/routines";
import { getHabitNames } from "@/lib/queries/habits";
import { createRoutine } from "@/lib/actions/routines";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { RoutineForm } from "@/components/habit/routine-form";
import { RutinasClient } from "./rutinas-client";

export default async function RutinasPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const [routines, habits] = await Promise.all([getRoutinesWithStats(today), getHabitNames()]);

  return (
    <div>
      <RutinasClient routines={routines} />
      <div className="mt-6 border-t border-border pt-5">
        <RoutineForm action={createRoutine} habits={habits} />
      </div>
    </div>
  );
}
