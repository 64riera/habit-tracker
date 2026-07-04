import { notFound } from "next/navigation";
import { getCategories, getHabitById } from "@/lib/queries/habits";
import { archiveHabit, updateHabit } from "@/lib/actions/habits";
import { HabitForm, ArchiveHabitButton } from "@/components/habit/habit-form";
import { ContentHeader } from "@/components/nav/content-header";

export default async function HabitoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [categories, habit] = await Promise.all([getCategories(), getHabitById(id)]);

  if (!habit) notFound();

  const updateAction = updateHabit.bind(null, id);
  const archiveAction = archiveHabit.bind(null, id);

  return (
    <div className="flex flex-1 flex-col">
      <ContentHeader
        titleKey="screens.habitoDetalle.title"
        subtitleKey="screens.habitoDetalle.subtitle"
      />
      <HabitForm action={updateAction} categories={categories} habit={habit} />
      <div className="mt-2">
        <ArchiveHabitButton action={archiveAction} />
      </div>
    </div>
  );
}
