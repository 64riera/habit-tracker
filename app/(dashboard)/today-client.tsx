"use client";

import { startTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { HabitCheckRow } from "@/components/habit/habit-check-row";
import { RoutineQuickActions } from "@/components/habit/routine-quick-actions";
import { useTodaySummary } from "@/components/habit/today-summary-context";
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
import { swrKeys } from "@/lib/swr/keys";
import { usePageData } from "@/lib/swr/use-page-data";
import { fetchCategoriesAction } from "@/lib/actions/habits-read";
import { fetchTodayAction } from "@/lib/actions/today-read";
import type { CategoryRow, HabitWithExtras } from "@/lib/queries/habits";
import type { RoutineToday } from "@/lib/queries/routines";

export function TodayClient({
  habits: initialHabits,
  routines: initialRoutines,
  date,
  today,
  categories: initialCategories,
}: {
  habits: HabitWithExtras[];
  routines: RoutineToday[];
  date: string;
  today: string;
  categories: CategoryRow[];
}) {
  const { t } = useI18n();
  // Memoized: usePageData compares this by reference to detect a fresh
  // Server Component render (e.g. after a create/edit form's redirect), and
  // a new object literal here on every render would defeat that check.
  const initialTodayData = useMemo(
    () => ({ habits: initialHabits, routines: initialRoutines }),
    [initialHabits, initialRoutines]
  );
  const { data } = usePageData(swrKeys.todayHabits(date), () => fetchTodayAction(date), initialTodayData);
  const { data: categories } = usePageData(swrKeys.categories(), fetchCategoriesAction, initialCategories);
  const habits = data.habits;
  const routines = data.routines;
  const { pendingMutations } = useOffline();
  const { setSummary } = useTodaySummary();
  const isToday = date === today;

  // Memoized over `pendingMutations`: pendingHabit*() build a new
  // array/Map/Set on every call, and without memoizing here that new
  // identity propagated to displayHabits on every render (see deps below),
  // which reopened the useEffect that reports the summary to
  // TodaySummaryContext, whose setState re-rendered this component (a
  // consumer of the same context) — an infinite render loop ("Maximum update
  // depth exceeded"), visible especially with empty pendingMutations on new
  // accounts with no habits.
  const pendingNewHabits = useMemo(() => pendingHabitCreates(pendingMutations), [pendingMutations]);
  const pendingEdits = useMemo(() => pendingHabitUpdates(pendingMutations), [pendingMutations]);
  const pendingArchiveIds = useMemo(() => pendingHabitArchiveIds(pendingMutations), [pendingMutations]);
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

  // The summary (%, streak) is computed here because it depends on
  // displayHabits (server + offline queue merged), but it's shown in
  // TodaySummaryDisplay, which lives outside page.tsx's <Suspense
  // key={date}> and therefore survives across day changes — reporting it
  // through context instead of rendering it here is what lets it animate
  // the transition instead of disappearing inside the loading skeleton.
  //
  // startTransition here is mandatory, not cosmetic: this component finishes
  // mounting as part of the navigation (the <Suspense key={date}>
  // resolving), which Next.js already treats as a pending transition.
  // Without marking this setState as part of the same transition, React
  // treats it as an urgent update that competes with that ongoing
  // transition — in practice, the router never got to confirm the
  // navigation (the URL wouldn't change) because it kept competing with
  // this update from a component outside the Suspense boundary.
  useEffect(() => {
    const done = displayHabits.filter((h) => h.todayLog?.status === "done").length;
    const inProgress = displayHabits.filter((h) => h.todayLog?.status === "partial").length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const best = displayHabits.reduce<HabitWithExtras | null>((acc, h) => {
      if (!acc || h.streak.longest > acc.streak.longest) return h;
      return acc;
    }, null);
    startTransition(() => {
      setSummary({
        total,
        done,
        inProgress,
        pct,
        bestStreak: best && best.streak.longest > 0 ? { habitName: best.name, days: best.streak.longest } : null,
      });
    });
  }, [displayHabits, total, setSummary]);

  return (
    <>
      {total === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted">
            {isToday ? t("checkin.noHabitsToday") : t("checkin.noHabitsThisDay")}
          </p>
          <Link
            href="/habits/new"
            className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-4 py-2 text-xs text-muted"
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
            {t("habit.newHabitShort")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:gap-[22px]">
          {/* No need for key={date} here: TodayClient as a whole remounts
              when the date changes because it lives under page.tsx's
              <Suspense key={date}>, so HabitCheckRow/RoutineQuickActions
              already start from fresh state (status/value/editorOpen, the
              optimistic Set) without repeating that mechanism at this
              level. */}
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
    </>
  );
}
