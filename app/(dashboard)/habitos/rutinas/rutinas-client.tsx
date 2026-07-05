"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import {
  pendingRoutineCreates,
  pendingRoutineUpdates,
  pendingRoutineDeleteIds,
  buildGhostRoutine,
  applyPendingRoutineEdit,
} from "@/lib/offline/pending-selectors";
import type { RoutineWithStats } from "@/lib/queries/routines";

export function RutinasClient({
  routines,
  habits,
}: {
  routines: RoutineWithStats[];
  habits: { id: string; name: string }[];
}) {
  const { t } = useI18n();
  const { pendingMutations } = useOffline();

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

  return (
    <div>
      <ContentHeader titleKey="routines.title" subtitleKey="routines.subtitle" />
      <div className="mb-3 flex justify-end">
        <a
          href="#crear-rutina"
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] text-muted"
        >
          <Plus size={13} strokeWidth={2} aria-hidden />
          {t("routines.newRoutine")}
        </a>
      </div>
      <div className="flex flex-col gap-0.5">
        {displayRoutines.map((r) => {
          const isPending = pendingIds.has(r.id);
          return (
            <Link
              key={r.id}
              href={`/habitos/rutinas/${r.id}`}
              className="flex items-center justify-between gap-3 border-b border-border py-3"
              style={isPending ? { opacity: 0.6 } : undefined}
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">
                  {r.name}
                  {isPending && ` · ${t("offline.pendingItem")}`}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-muted">
                  {r.habits.map((h) => h.name).join(" · ")}
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-muted">
                {t("routines.completionPct", { pct: r.completionPct30 })}
              </span>
            </Link>
          );
        })}
        {displayRoutines.length === 0 && (
          <p className="py-2 text-sm text-muted">{t("routines.empty")}</p>
        )}
      </div>
    </div>
  );
}
