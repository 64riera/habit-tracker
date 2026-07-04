import { notFound } from "next/navigation";
import { getRoutines } from "@/lib/queries/routines";
import { getHabitNames } from "@/lib/queries/habits";
import { deleteRoutine, updateRoutine } from "@/lib/actions/routines";
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

  const updateAction = updateRoutine.bind(null, id);
  const deleteAction = deleteRoutine.bind(null, id);

  return (
    <div>
      <ContentHeader titleKey="routines.title" subtitleKey="screens.habitos.subtitle" />
      <RoutineForm action={updateAction} habits={habits} routine={routine} />
      <div className="mt-3">
        <DeleteRoutineButton action={deleteAction} />
      </div>
    </div>
  );
}
