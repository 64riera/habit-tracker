"use client";

import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { categoryDisplayName } from "@/lib/habits/describe";
import { MetricSummaryCard } from "@/components/stats/metric-summary-card";
import { StatMini } from "@/components/stats/stat-mini";
import { WeekdayPattern } from "@/components/finance/weekday-pattern";
import { TransactionRow } from "@/components/finance/transaction-row";
import { formatCurrency, type Currency } from "@/lib/finance/format";
import type { WeekdayExpense, TransactionStats } from "@/lib/finance/aggregate";
import type { FinanceCategoryRow, TransactionWithCategory } from "@/lib/queries/finance";

type Comparison = { current: number; previous: number; changePct: number };
type TopCategory = { categoryId: string; total: number; pct: number };

/**
 * Everything beyond the headline totals/breakdown/trend already shown above
 * the fold: comparison vs. the previous period, daily average, savings
 * rate, the single biggest expense, the top category's share, and a
 * day-of-week pattern. Collapsed by default so the default screen stays as
 * quick to scan as before — this is the "tell me more" layer for whoever
 * taps it, not something everyone has to scroll past every time.
 */
export function FinanceInsights({
  comparison,
  dailyAverage,
  savings,
  topExpense,
  topCategory,
  categories,
  txStats,
  weekdayData,
  currency,
}: {
  comparison: Comparison | null;
  dailyAverage: number;
  savings: number | null;
  topExpense: TransactionWithCategory | null;
  topCategory: TopCategory | null;
  categories: FinanceCategoryRow[];
  txStats: TransactionStats;
  weekdayData: WeekdayExpense[] | null;
  currency: Currency;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const topCategoryRow = topCategory ? catById.get(topCategory.categoryId) : undefined;
  const hasAnything = comparison || dailyAverage > 0 || savings !== null || topExpense || topCategory || txStats.count > 0;

  if (!hasAnything) return null;

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger
        className="flex w-full items-center justify-between rounded-lg py-1.5 text-[12px] font-medium text-muted"
      >
        {open ? t("finance.insights.hide") : t("finance.insights.show")}
        <ChevronDown
          size={15}
          strokeWidth={2}
          aria-hidden
          className={cn("transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]", open && "rotate-180")}
        />
      </Collapsible.Trigger>

      <Collapsible.Content className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
        <div className="flex flex-col gap-5 pt-4">
          {comparison && (
            <MetricSummaryCard
              title={t("finance.insights.vsPrevious")}
              value={`${comparison.changePct > 0 ? "+" : ""}${comparison.changePct}%`}
              delta={{ text: comparison.changePct <= 0 ? t("finance.insights.spendingDown") : t("finance.insights.spendingUp"), positive: comparison.changePct <= 0 }}
              secondaryStats={[
                { label: t("finance.insights.thisPeriod"), value: formatCurrency(comparison.current, currency, locale) },
                { label: t("finance.insights.previousPeriod"), value: formatCurrency(comparison.previous, currency, locale) },
              ]}
            />
          )}

          <div className="flex flex-wrap gap-2.5">
            {dailyAverage > 0 && (
              <StatMini label={t("finance.insights.dailyAverage")} value={formatCurrency(dailyAverage, currency, locale)} />
            )}
            {savings !== null && (
              <StatMini
                label={t("finance.insights.savingsRate")}
                value={`${savings}%`}
                valueColor={savings >= 0 ? "var(--color-income)" : "var(--color-cat-fitness)"}
              />
            )}
            {txStats.count > 0 && (
              <StatMini label={t("finance.insights.transactionCount")} value={String(txStats.count)} />
            )}
            {txStats.avgExpense > 0 && (
              <StatMini label={t("finance.insights.avgTransaction")} value={formatCurrency(txStats.avgExpense, currency, locale)} />
            )}
            {topCategory && topCategoryRow && (
              <StatMini
                label={t("finance.insights.topCategory")}
                value={`${topCategoryRow.icon} ${categoryDisplayName(topCategoryRow, locale)} · ${topCategory.pct}%`}
              />
            )}
          </div>

          {weekdayData && (
            <div>
              <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">
                {t("finance.insights.weekdayPattern")}
              </div>
              <WeekdayPattern data={weekdayData} />
            </div>
          )}

          {topExpense && (
            <div>
              <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">
                {t("finance.insights.topExpense")}
              </div>
              <div className="rounded-xl border border-border px-3.5">
                <TransactionRow transaction={topExpense} currency={currency} showDivider={false} />
              </div>
            </div>
          )}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
