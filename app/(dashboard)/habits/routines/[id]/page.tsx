import { notFound } from "next/navigation";
import { getRoutines } from "@/lib/queries/routines";
import { getHabitNames } from "@/lib/queries/habits";
import { RoutineForm } from "@/components/habit/routine-form";
import { ContentHeader } from "@/components/nav/content-header";
import { DeleteRoutineButton } from "./delete-routine-button";

export default async function RutinaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [routines, habits] = await Promise.all([getRoutines(), getHabitNames()]);
  const routine = routines.find((r) => r.id === id);
  if (!routine) notFound();

  return (
    <div>
      <ContentHeader
        titleKey="routines.title"
        subtitleKey="screens.habitos.subtitle"
        backHref="/habits/routines"
      />
      <RoutineForm habits={habits} routine={routine} />
      <div className="mt-3">
        <DeleteRoutineButton routineId={id} />
      </div>
    </div>
  );
}
