"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { Plus, Trash2 } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { SwipeableRow, SwipeableListProvider } from "@/components/ui/swipeable-row";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import { PendingSyncBadge } from "@/components/offline/pending-sync-badge";
import {
  pendingRoutineCreates,
  pendingRoutineUpdates,
  pendingRoutineDeleteIds,
  buildGhostRoutine,
  applyPendingRoutineEdit,
} from "@/lib/offline/pending-selectors";
import { swrKeys } from "@/lib/swr/keys";
import { usePageData } from "@/lib/swr/use-page-data";
import { fetchHabitNamesAction } from "@/lib/actions/habits-read";
import { fetchRoutinesAction } from "@/lib/actions/routines-read";
import type { RoutineWithStats } from "@/lib/queries/routines";

export function RutinasClient({
  routines: initialRoutines,
  habits: initialHabits,
  today,
}: {
  routines: RoutineWithStats[];
  habits: { id: string; name: string }[];
  today: string;
}) {
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const { data: routines } = usePageData(swrKeys.routines(today), () => fetchRoutinesAction(today), initialRoutines);
  const { data: habits } = usePageData(swrKeys.habitNames(), fetchHabitNamesAction, initialHabits);
  const { pendingMutations, runOrQueue } = useOffline();
  const [, startTransition] = useTransition();

  const pendingNew = pendingRoutineCreates(pendingMutations);
  const pendingEdits = pendingRoutineUpdates(pendingMutations);
  const pendingDeleteIds = pendingRoutineDeleteIds(pendingMutations);
  const pendingIds = useMemo(
    () => new Set([...pendingNew.map((m) => m.id), ...pendingEdits.keys()]),
    [pendingNew, pendingEdits]
  );

  const displayRoutines = useMemo(() => {
    const overlaid = routines
      .filter((r) => !pendingDeleteIds.has(r.id))
      .map((r) => (pendingEdits.has(r.id) ? applyPendingRoutineEdit(r, pendingEdits.get(r.id)!, habits) : r));
    const ghosts = pendingNew.map((m) => buildGhostRoutine(m.id, m.values, habits));
    return [...overlaid, ...ghosts];
  }, [routines, pendingEdits, pendingDeleteIds, pendingNew, habits]);

  function handleDelete(routineId: string) {
    if (!confirm(t("routines.confirmDelete"))) return;
    startTransition(async () => {
      await runOrQueue({ type: "deleteRoutine", routineId });
      mutate(swrKeys.routines(today));
    });
  }

  return (
    <div>
      <ContentHeader titleKey="routines.title" subtitleKey="routines.subtitle" backHref="/habits" />
      <div className="mb-3 flex justify-end">
        <a
          href="#crear-rutina"
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] text-muted"
        >
          <Plus size={13} strokeWidth={2} aria-hidden />
          {t("routines.newRoutine")}
        </a>
      </div>
      <SwipeableListProvider>
        <div className="flex flex-col gap-0.5">
          {displayRoutines.map((r) => {
            const isPending = pendingIds.has(r.id);
            return (
              <SwipeableRow
                key={r.id}
                id={r.id}
                trailingActions={[
                  {
                    key: "delete",
                    label: t("common.delete"),
                    icon: <Trash2 size={16} strokeWidth={2} aria-hidden />,
                    background: "var(--color-cat-fitness)",
                    onAction: () => handleDelete(r.id),
                  },
                ]}
              >
                <Link
                  href={`/habits/routines/${r.id}`}
                  className="flex items-center justify-between gap-3 border-b border-border py-3"
                  style={isPending ? { opacity: 0.6 } : undefined}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
                      <span className="truncate">{r.name}</span>
                      {isPending && <PendingSyncBadge />}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted">
                      {r.habits.map((h) => h.name).join(" · ")}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-muted">
                    {t("routines.completionPct", { pct: r.completionPct30 })}
                  </span>
                </Link>
              </SwipeableRow>
            );
          })}
          {displayRoutines.length === 0 && (
            <p className="py-2 text-sm text-muted">{t("routines.empty")}</p>
          )}
        </div>
      </SwipeableListProvider>
    </div>
  );
}
