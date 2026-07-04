"use client";

import Link from "next/link";
import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";
import type { RoutineWithStats } from "@/lib/queries/routines";

export function RutinasClient({ routines }: { routines: RoutineWithStats[] }) {
  const { t } = useI18n();

  return (
    <div>
      <ContentHeader titleKey="routines.title" subtitleKey="screens.habitos.subtitle" />
      <div className="flex flex-col gap-0.5">
        {routines.map((r) => (
          <Link
            key={r.id}
            href={`/habitos/rutinas/${r.id}`}
            className="flex items-center justify-between gap-3 border-b border-border py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{r.name}</div>
              <div className="mt-0.5 truncate text-[11px] text-muted">
                {r.habits.map((h) => h.name).join(" · ")}
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-muted">
              {t("routines.completionPct", { pct: r.completionPct30 })}
            </span>
          </Link>
        ))}
        {routines.length === 0 && (
          <p className="py-2 text-sm text-muted">{t("routines.empty")}</p>
        )}
      </div>
    </div>
  );
}
