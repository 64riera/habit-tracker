"use client";

import { useI18n } from "@/lib/i18n/client";
import { formatCurrency, type Currency } from "@/lib/finance/format";
import type { PeriodTotals } from "@/lib/finance/aggregate";

export function PeriodSummary({ totals, currency }: { totals: PeriodTotals; currency: Currency }) {
  const { t, locale } = useI18n();

  const stats = [
    { key: "income", label: t("finance.summary.income"), value: totals.income, color: "var(--color-income)" },
    { key: "expense", label: t("finance.summary.expense"), value: totals.expense, color: "var(--color-expense)" },
    {
      key: "balance",
      label: t("finance.summary.balance"),
      value: totals.balance,
      color: totals.balance >= 0 ? "var(--color-income)" : "var(--color-cat-fitness)",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.key} className="rounded-xl border border-border px-3 py-3">
          <div className="text-[10px] tracking-wide text-muted uppercase">{s.label}</div>
          <div className="mt-1 truncate text-[15px] font-semibold tabular-nums" style={{ color: s.color }}>
            {formatCurrency(s.value, currency, locale)}
          </div>
        </div>
      ))}
    </div>
  );
}
