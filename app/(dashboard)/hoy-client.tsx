"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { HabitCheckRow } from "@/components/habit/habit-check-row";
import { RoutineQuickActions } from "@/components/habit/routine-quick-actions";
import { DaySwitcher } from "@/components/habit/day-switcher";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import {
  pendingHabitCreates,
  pendingHabitUpdates,
  pendingHabitArchiveIds,
  buildGhostHabit,
  applyPendingHabitEdit,
} from "@/lib/offline/pending-selectors";
import { isDateApplicable } from "@/lib/habits/frequency";
import type { CategoryRow, HabitWithExtras } from "@/lib/queries/habits";
import type { RoutineToday } from "@/lib/queries/routines";

export function HoyClient({
  habits,
  routines,
  date,
  today,
  categories,
}: {
  habits: HabitWithExtras[];
  routines: RoutineToday[];
  date: string;
  today: string;
  categories: CategoryRow[];
}) {
  const { t } = useI18n();
  const { pendingMutations } = useOffline();
  const isToday = date === today;

  const pendingNewHabits = pendingHabitCreates(pendingMutations);
  const pendingEdits = pendingHabitUpdates(pendingMutations);
  const pendingArchiveIds = pendingHabitArchiveIds(pendingMutations);
  const pendingIds = useMemo(
    () => new Set([...pendingNewHabits.map((m) => m.id), ...pendingEdits.keys()]),
    [pendingNewHabits, pendingEdits]
  );

  const displayHabits = useMemo(() => {
    const overlaid = habits
      .filter((h) => !pendingArchiveIds.has(h.id))
      .map((h) => (pendingEdits.has(h.id) ? applyPendingHabitEdit(h, pendingEdits.get(h.id)!, categories) : h));
    const ghosts = pendingNewHabits.map((m) => buildGhostHabit(m.id, m.values, categories));
    return [...overlaid, ...ghosts].filter((h) => isDateApplicable(h, date));
  }, [habits, pendingEdits, pendingArchiveIds, pendingNewHabits, categories, date]);

  const total = displayHabits.length;
  const done = displayHabits.filter((h) => h.todayLog?.status === "done").length;
  const inProgress = displayHabits.filter((h) => h.todayLog?.status === "partial").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const best = displayHabits.reduce<HabitWithExtras | null>((acc, h) => {
    if (!acc || h.streak.longest > acc.streak.longest) return h;
    return acc;
  }, null);

  return (
    <div>
      <ContentHeader titleKey="screens.hoy.title" subtitleKey="screens.hoy.subtitle" />

      <DaySwitcher date={date} today={today} />

      {total === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted">
            {isToday ? t("checkin.noHabitsToday") : t("checkin.noHabitsThisDay")}
          </p>
          <Link
            href="/habitos/nuevo"
            className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-4 py-2 text-xs text-muted"
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
            {t("habit.newHabitShort")}
          </Link>
        </div>
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
            {displayHabits.map((habit) => (
              <HabitCheckRow
                key={habit.id}
                habit={habit}
                date={date}
                isPendingSync={pendingIds.has(habit.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
