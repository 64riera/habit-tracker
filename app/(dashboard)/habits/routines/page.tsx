import { getRoutinesWithStats } from "@/lib/queries/routines";
import { getHabitNames } from "@/lib/queries/habits";
import { getServerToday } from "@/lib/settings/date-server";
import { RoutineForm } from "@/components/habit/routine-form";
import { RutinasClient } from "./routines-client";

export default async function RutinasPage() {
  const today = await getServerToday();
  const [routines, habits] = await Promise.all([getRoutinesWithStats(today), getHabitNames()]);

  return (
    <div>
      <RutinasClient routines={routines} habits={habits} today={today} />
      <div id="crear-rutina" className="mt-6 scroll-mt-6 border-t border-border pt-5">
        <RoutineForm habits={habits} />
      </div>
    </div>
  );
}
