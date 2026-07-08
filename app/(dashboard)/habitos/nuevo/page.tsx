import { getCategories } from "@/lib/queries/habits";
import { HabitForm } from "@/components/habit/habit-form";
import { ContentHeader } from "@/components/nav/content-header";

export default async function NuevoHabitoPage() {
  const categories = await getCategories();

  return (
    <div className="flex flex-1 flex-col">
      <ContentHeader
        titleKey="habit.newHabit"
        subtitleKey="habit.newHabitSubtitle"
        backHref="/habitos"
      />
      <HabitForm categories={categories} />
    </div>
  );
}
