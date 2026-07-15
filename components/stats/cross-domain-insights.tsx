"use client";

import { useI18n } from "@/lib/i18n/client";
import { MetricSummaryCard } from "@/components/stats/metric-summary-card";
import { formatCurrency, type Currency } from "@/lib/finance/format";
import { formatMinutesShort } from "@/lib/focus/format";
import type { CrossDomainInsights as CrossDomainInsightsData } from "@/lib/queries/insights";
import type { BucketComparison } from "@/lib/insights/compute";

/** % change from `base` to `compared` — null when base is 0, since a ratio
 * against zero (e.g. $0 average spend) isn't a meaningful percentage. */
function percentDelta(base: number, compared: number): number | null {
  if (base === 0) return null;
  return Math.round(((compared - base) / base) * 100);
}

function formatDeltaValue(pct: number): string {
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

type InsightSpec = {
  key: string;
  comparison: BucketComparison;
  /** Which bucket average is the % baseline — the other is expressed relative to it. */
  base: "a" | "b";
  titleKey: string;
  deltaKey: string;
  aLabelKey: string;
  bLabelKey: string;
  formatValue: (v: number) => string;
};

/**
 * Cross-domain correlation cards for the Estadísticas page — the multi-domain
 * counterpart to PatternsPanel's single-domain (habit-only) cards. Reuses
 * MetricSummaryCard as-is (same "delta hero + two raw secondaryStats" shape
 * FinanceInsights already uses for its own period-comparison card) instead
 * of introducing a new card style for what is the same kind of finding.
 */
export function CrossDomainInsights({
  insights,
  currency,
}: {
  insights: CrossDomainInsightsData;
  currency: Currency;
}) {
  const { t, locale } = useI18n();
  const money = (v: number) => formatCurrency(v, currency, locale);
  const percent = (v: number) => `${Math.round(v * 100)}%`;

  const specs: InsightSpec[] = [
    {
      key: "spendByHabitCompletion",
      comparison: insights.spendByHabitCompletion,
      base: "a",
      titleKey: "stats.spendByHabitCompletionTitle",
      deltaKey: "stats.spendByHabitCompletionDelta",
      aLabelKey: "stats.habitsGoodDayLabel",
      bLabelKey: "stats.habitsBadDayLabel",
      formatValue: money,
    },
    {
      key: "focusByGymDay",
      comparison: insights.focusByGymDay,
      base: "b",
      titleKey: "stats.focusByGymDayTitle",
      deltaKey: "stats.focusByGymDayDelta",
      aLabelKey: "stats.gymDayLabel",
      bLabelKey: "stats.noGymDayLabel",
      formatValue: formatMinutesShort,
    },
    {
      key: "habitCompletionByGymDay",
      comparison: insights.habitCompletionByGymDay,
      base: "b",
      titleKey: "stats.habitCompletionByGymDayTitle",
      deltaKey: "stats.habitCompletionByGymDayDelta",
      aLabelKey: "stats.gymDayLabel",
      bLabelKey: "stats.noGymDayLabel",
      formatValue: percent,
    },
    {
      key: "spendByMood",
      comparison: insights.spendByMood,
      base: "a",
      titleKey: "stats.spendByMoodTitle",
      deltaKey: "stats.spendByMoodDelta",
      aLabelKey: "stats.lowMoodLabel",
      bLabelKey: "stats.highMoodLabel",
      formatValue: money,
    },
  ];

  const cards = specs.flatMap((spec) => {
    const comparison = spec.comparison;
    if (!comparison) return [];
    const [baseAvg, comparedAvg] =
      spec.base === "a" ? [comparison.aAvg, comparison.bAvg] : [comparison.bAvg, comparison.aAvg];
    const pct = percentDelta(baseAvg, comparedAvg);
    if (pct === null) return [];
    return [
      {
        key: spec.key,
        title: t(spec.titleKey),
        value: formatDeltaValue(pct),
        deltaText: t(spec.deltaKey),
        secondaryStats: [
          { label: t(spec.aLabelKey), value: spec.formatValue(comparison.aAvg) },
          { label: t(spec.bLabelKey), value: spec.formatValue(comparison.bAvg) },
        ],
      },
    ];
  });

  if (cards.length === 0) return null;

  return (
    <div>
      <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">{t("stats.crossInsightsTitle")}</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <MetricSummaryCard
            key={card.key}
            title={card.title}
            value={card.value}
            delta={{ text: card.deltaText, positive: true }}
            secondaryStats={card.secondaryStats}
          />
        ))}
      </div>
    </div>
  );
}
