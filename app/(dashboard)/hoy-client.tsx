"use client";

import { ContentHeader } from "@/components/nav/content-header";
import { HabitCheckRow } from "@/components/habit/habit-check-row";
import { RoutineQuickActions } from "@/components/habit/routine-quick-actions";
import { useI18n } from "@/lib/i18n/client";
import type { HabitWithExtras } from "@/lib/queries/habits";
import type { RoutineToday } from "@/lib/queries/routines";

export function HoyClient({
  habits,
  routines,
  date,
}: {
  habits: HabitWithExtras[];
  routines: RoutineToday[];
  date: string;
}) {
  const { t } = useI18n();

  const total = habits.length;
  const done = habits.filter((h) => h.todayLog?.status === "done").length;
  const inProgress = habits.filter((h) => h.todayLog?.status === "partial").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const best = habits.reduce<HabitWithExtras | null>((acc, h) => {
    if (!acc || h.streak.longest > acc.streak.longest) return h;
    return acc;
  }, null);

  return (
    <div>
      <ContentHeader titleKey="screens.hoy.title" subtitleKey="screens.hoy.subtitle" />

      {total === 0 ? (
        <p className="text-sm text-muted">{t("checkin.noHabitsToday")}</p>
      ) : (
        <div className="flex flex-col gap-4 md:gap-[22px]">
          <div>
            <div className="flex items-baseline gap-3.5">
              <div className="font-serif-italic text-[34px] font-semibold md:text-[38px]">
                {pct}%
              </div>
              <div className="text-xs text-muted md:text-[13px]">
                {inProgress > 0
                  ? t("checkin.summaryWithProgress", { done, total, inProgress })
                  : t("checkin.summary", { done, total })}
              </div>
            </div>
            <div className="mt-2.5 h-0.5 rounded-full bg-border md:mt-3">
              <div
                className="h-0.5 rounded-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {best && best.streak.longest > 0 && (
            <div className="text-right font-serif-italic text-xs text-muted md:text-left">
              {t("checkin.bestStreak", { days: best.streak.longest, habit: best.name })}
            </div>
          )}

          <RoutineQuickActions routines={routines} date={date} />

          <div className="flex flex-col">
            {habits.map((habit) => (
              <HabitCheckRow key={habit.id} habit={habit} date={date} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
