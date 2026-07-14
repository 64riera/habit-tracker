"use client";

import { useI18n } from "@/lib/i18n/client";
import { TrendBars } from "@/components/charts/trend-bars";
import { formatCurrency, type Currency } from "@/lib/finance/format";
import type { BucketTotal } from "@/lib/finance/aggregate";

/** Expense trend only — spend is the thing this screen is meant to help you
 * watch day to day; income is comparatively rare and already visible in
 * PeriodSummary. */
export function TrendChart({ buckets, currency }: { buckets: BucketTotal[]; currency: Currency }) {
  const { t, locale } = useI18n();
  if (buckets.length <= 1) return null;

  return (
    <TrendBars
      points={buckets.map((b) => ({ date: b.key, value: b.expense }))}
      formatLabel={(p) => t("finance.trendBarLabel", { date: p.date, amount: formatCurrency(p.value, currency, locale) })}
    />
  );
}
