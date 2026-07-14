"use client";

import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { CategoryBars } from "@/components/charts/category-bars";
import { formatCurrency, type Currency } from "@/lib/finance/format";
import type { FinanceCategoryRow } from "@/lib/queries/finance";
import type { PeriodTotals } from "@/lib/finance/aggregate";

export function CategoryBreakdown({
  byCategory,
  categories,
  currency,
}: {
  byCategory: PeriodTotals["byCategory"];
  categories: FinanceCategoryRow[];
  currency: Currency;
}) {
  const { t, locale } = useI18n();
  if (byCategory.length === 0) return <p className="text-sm text-muted">{t("finance.noExpenses")}</p>;

  const catById = new Map(categories.map((c) => [c.id, c]));
  const items = byCategory.map((entry) => {
    const category = catById.get(entry.categoryId);
    return {
      key: entry.categoryId,
      label: category ? `${category.icon} ${categoryDisplayName(category, locale)}` : "—",
      value: entry.total,
      color: category?.color ?? "var(--color-muted)",
    };
  });

  return <CategoryBars items={items} formatValue={(v) => formatCurrency(v, currency, locale)} />;
}
