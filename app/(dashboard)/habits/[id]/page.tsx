import { notFound } from "next/navigation";
import { getCategories, getHabitById } from "@/lib/queries/habits";
import { getBestMonthCheck, getHabitMonthSummary } from "@/lib/queries/summary";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { HabitForm, ArchiveHabitButton } from "@/components/habit/habit-form";
import { PeriodSummaryCard } from "@/components/stats/period-summary-card";
import { StreakProgress } from "@/components/stats/streak-progress";
import { BestMonthBanner } from "@/components/stats/best-month-banner";
import { ContentHeader } from "@/components/nav/content-header";
import { FocusOnHabitLink } from "@/components/focus/focus-on-habit-link";

export default async function HabitoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const [categories, habit, monthSummary, bestMonth] = await Promise.all([
    getCategories(),
    getHabitById(id),
    getHabitMonthSummary(id, today),
    getBestMonthCheck(id, today),
  ]);

  if (!habit) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <ContentHeader
        titleKey="screens.habitoDetalle.title"
        subtitleKey="screens.habitoDetalle.subtitle"
        backHref="/habits"
      />

      <div className="mb-5 flex flex-col gap-3">
        <BestMonthBanner check={bestMonth} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PeriodSummaryCard
            titleKey="stats.monthlySummary"
            vsLabelKey="stats.vsLastMonth"
            data={monthSummary}
          />
          <StreakProgress current={habit.streak.current} longest={habit.streak.longest} />
        </div>
      </div>

      <HabitForm categories={categories} habit={habit} />
      <div className="mt-2 flex items-center justify-between">
        <ArchiveHabitButton habitId={id} status={habit.status} />
        <FocusOnHabitLink habitId={id} />
      </div>
    </div>
  );
}
