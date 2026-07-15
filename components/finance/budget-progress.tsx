"use client";

import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { formatCurrency, type Currency } from "@/lib/finance/format";
import { budgetStatus } from "@/lib/finance/budgets";
import type { FinanceBudgetRow, FinanceCategoryRow } from "@/lib/queries/finance";

/** Renders nothing until the user has set at least one budget — this is an
 * opt-in feature, not a default empty state (see finance.budgets.empty on
 * the /finance/budgets management screen for that). Below the 80% warning
 * threshold a category shows no caption at all: the quiet ones stay quiet,
 * so the one line of text that does appear (warning/over) actually draws
 * the eye instead of competing with nine identical "on track" labels. */
export function BudgetProgress({
  budgets,
  spentByCategory,
  categories,
  currency,
}: {
  budgets: FinanceBudgetRow[];
  spentByCategory: Map<string, number>;
  categories: FinanceCategoryRow[];
  currency: Currency;
}) {
  const { t, locale } = useI18n();
  if (budgets.length === 0) return null;

  const catById = new Map(categories.map((c) => [c.id, c]));
  const rows = budgets
    .map((b) => {
      const category = catById.get(b.categoryId);
      if (!category) return null;
      return { category, status: budgetStatus(spentByCategory.get(b.categoryId) ?? 0, b.monthlyLimit) };
    })
    .filter((r): r is { category: FinanceCategoryRow; status: ReturnType<typeof budgetStatus> } => r !== null)
    .sort((a, b) => b.status.ratio - a.status.ratio);

  return (
    <div className="flex flex-col gap-3.5">
      {rows.map(({ category, status }) => {
        const barColor =
          status.state === "over"
            ? "var(--color-cat-fitness)"
            : status.state === "warning"
              ? "var(--color-warning)"
              : category.color;
        return (
          <div key={category.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 truncate text-[13px]">
                <span aria-hidden>{category.icon}</span>
                {categoryDisplayName(category, locale)}
              </span>
              <span className="shrink-0 text-[12px] tabular-nums text-muted">
                {formatCurrency(status.spent, currency, locale)} / {formatCurrency(status.limit, currency, locale)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-border">
              <div
                className="h-1.5 rounded-full transition-[width] duration-300"
                style={{ width: `${Math.min(100, status.ratio * 100)}%`, background: barColor }}
              />
            </div>
            {status.state !== "ok" && (
              <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: barColor }}>
                <AlertTriangle size={11} strokeWidth={2} aria-hidden />
                {status.state === "over"
                  ? t("finance.budgets.over", { amount: formatCurrency(status.overBy, currency, locale), pct: status.pct })
                  : t("finance.budgets.warning", { pct: status.pct })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
