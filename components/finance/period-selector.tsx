"use client";

import { useI18n } from "@/lib/i18n/client";
import type { Period } from "@/lib/finance/aggregate";

const PERIODS: Period[] = ["day", "week", "month", "year", "custom"];

export function PeriodSelector({
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomChange,
}: {
  period: Period;
  onPeriodChange: (p: Period) => void;
  customFrom: string;
  customTo: string;
  onCustomChange: (from: string, to: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => onPeriodChange(p)}
            className="rounded-full border px-3 py-1.5 text-[11px] font-medium"
            style={{
              background: period === p ? "var(--color-text)" : "transparent",
              color: period === p ? "var(--color-surface)" : "var(--color-muted)",
              borderColor: period === p ? "var(--color-text)" : "var(--color-border)",
            }}
          >
            {t(`finance.period.${p}`)}
          </button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            aria-label={t("finance.rangeFrom")}
            className="rounded-lg border border-border bg-transparent px-3 py-1.5 text-[12.5px] outline-none focus:border-text"
          />
          <span className="text-[11px] text-muted">{t("finance.rangeTo")}</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
            aria-label={t("finance.rangeTo")}
            className="rounded-lg border border-border bg-transparent px-3 py-1.5 text-[12.5px] outline-none focus:border-text"
          />
        </div>
      )}
    </div>
  );
}
