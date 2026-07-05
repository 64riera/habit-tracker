"use client";

import { useI18n } from "@/lib/i18n/client";
import type { TrendPoint } from "@/lib/queries/stats";

export function TrendBars({ points }: { points: TrendPoint[] }) {
  const { t } = useI18n();

  return (
    <div className="overflow-x-auto">
      <div className="flex h-16 items-end gap-1.5">
        {points.map((p, i) => (
          <div
            key={p.date}
            role="img"
            aria-label={t("stats.trendBarLabel", { date: p.date, pct: p.pct })}
            title={`${p.date}: ${p.pct}%`}
            className="w-3.5 shrink-0 rounded-t-[3px]"
            style={{
              height: `${Math.max(p.pct, 2)}%`,
              background:
                i === points.length - 1
                  ? "var(--color-accent)"
                  : "color-mix(in srgb, var(--color-text) 22%, transparent)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
