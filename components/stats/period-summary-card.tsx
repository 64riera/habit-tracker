"use client";

import { useI18n } from "@/lib/i18n/client";
import type { PeriodComparison } from "@/lib/queries/summary";

export function PeriodSummaryCard({
  titleKey,
  vsLabelKey,
  data,
}: {
  titleKey: string;
  vsLabelKey: string;
  data: PeriodComparison;
}) {
  const { t } = useI18n();
  const { current, pctChange } = data;
  const sign = pctChange > 0 ? "+" : "";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[13px] font-semibold">{t(titleKey)}</div>
        {current.totalApplicable > 0 && (
          <div
            className="text-[11px] font-medium"
            style={{ color: pctChange >= 0 ? "var(--color-accent)" : "var(--color-muted)" }}
          >
            {sign}
            {pctChange}% {t(vsLabelKey)}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-3.5">
        <div className="font-serif-italic text-[26px] font-semibold">{current.pct}%</div>
      </div>

      <div className="flex gap-5 text-[11.5px] text-muted">
        <span>
          {t("stats.completed")} <span className="font-semibold text-text">{current.completed}</span>
        </span>
        <span>
          {t("stats.failed")} <span className="font-semibold text-text">{current.missed}</span>
        </span>
      </div>

      {current.bestStreak && (
        <div className="text-[11.5px] text-muted">
          {t("stats.bestStreakLabel")}:{" "}
          <span className="font-serif-italic text-text">
            {current.bestStreak.streak}{" "}
            {current.bestStreak.streak === 1 ? t("common.day") : t("common.days")} — {current.bestStreak.name}
          </span>
        </div>
      )}
    </div>
  );
}
