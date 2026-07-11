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
import type { CategoryRow, HabitWithExtras } from "@/lib/queries/habits";
import type { RoutineToday } from "@/lib/queries/routines";

export function TodayClient({
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
  const { setSummary } = useTodaySummary();
  const isToday = date === today;

  // Memoizados sobre `pendingMutations`: pendingHabit*() arman un array/Map/Set
  // nuevo en cada llamada, y sin memoizar acá esa identidad nueva se propagaba
  // a displayHabits en cada render (ver deps más abajo), lo que reabría el
  // useEffect que reporta el resumen a TodaySummaryContext, cuyo setState volvía
  // a renderizar este componente (consumidor del mismo contexto) — un loop de
  // renders infinito ("Maximum update depth exceeded"), visible sobre todo con
  // pendingMutations vacío en cuentas nuevas sin hábitos.
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

  // El resumen (%, racha) se calcula acá porque depende de displayHabits
  // (mezcla server + cola offline), pero se muestra en TodaySummaryDisplay,
  // que vive fuera del <Suspense key={date}> de page.tsx y por eso
  // sobrevive al cambiar de día — reportarlo por contexto en vez de
  // renderizarlo acá es lo que le permite animar la transición en vez de
  // desaparecer dentro del skeleton de carga.
  //
  // startTransition acá es obligatorio, no cosmético: este componente
  // termina de montarse como parte de la navegación (el <Suspense
  // key={date}> resolviendo), que Next.js ya maneja como una transición
  // pendiente. Sin marcar este setState como parte de la misma transición,
  // React lo trata como una actualización urgente que compite con esa
  // transición en curso — en la práctica, el router nunca llegaba a
  // confirmar la navegación (la URL no cambiaba) porque quedaba
  // compitiendo con esta actualización de un componente fuera del límite
  // de Suspense.
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
          {/* Sin necesidad de key={date} aquí: TodayClient entero se remonta al
              cambiar de fecha porque vive bajo el <Suspense key={date}> de
              page.tsx, así que HabitCheckRow/RoutineQuickActions ya parten
              de estado fresco (status/value/editorOpen, el Set optimista)
              sin repetir ese mecanismo a este nivel. */}
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
