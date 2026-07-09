"use client";

import { ContentHeader } from "@/components/nav/content-header";
import { HistorialTabs } from "@/components/nav/historial-tabs";
import { TrendBars } from "@/components/charts/trend-bars";
import { CategoryBars } from "@/components/charts/category-bars";
import { PeriodSummaryCard } from "@/components/stats/period-summary-card";
import { PatternsPanel } from "@/components/stats/patterns-panel";
import { useI18n } from "@/lib/i18n/client";
import type { CategoryStat, HabitStatCard, TrendPoint } from "@/lib/queries/stats";
import type { MoodCorrelation, WorstWeekday } from "@/lib/queries/patterns";
import type { PeriodComparison } from "@/lib/queries/summary";

export function EstadisticasClient({
  overall,
  trend,
  categories,
  cards,
  weekSummary,
  monthSummary,
  worstWeekday,
  moodCorrelation,
}: {
  overall: { pct7: number; pct30: number; pct90: number };
  trend: TrendPoint[];
  categories: CategoryStat[];
  cards: HabitStatCard[];
  weekSummary: PeriodComparison;
  monthSummary: PeriodComparison;
  worstWeekday: WorstWeekday;
  moodCorrelation: MoodCorrelation;
}) {
  const { t } = useI18n();

  const summaryCards = [
    { value: overall.pct7, label: t("stats.last7") },
    { value: overall.pct30, label: t("stats.last30") },
    { value: overall.pct90, label: t("stats.last90") },
  ];

  return (
    <div>
      <ContentHeader titleKey="screens.estadisticas.title" subtitleKey="screens.estadisticas.subtitle" />
      <HistorialTabs />

      <div className="flex flex-col gap-6">
        <div className="flex">
          {summaryCards.map((c, i) => (
            <div key={i} className="flex-1 border-l border-border px-4 first:border-l-0 first:pl-0 md:px-[22px]">
              <div className="font-serif-italic text-2xl font-semibold md:text-[30px]">
                {c.value}%
              </div>
              <div className="mt-1 text-[11.5px] text-muted">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PeriodSummaryCard
            titleKey="stats.weeklySummary"
            vsLabelKey="stats.vsLastWeek"
            data={weekSummary}
          />
          <PeriodSummaryCard
            titleKey="stats.monthlySummary"
            vsLabelKey="stats.vsLastMonth"
            data={monthSummary}
          />
        </div>

        <PatternsPanel worstWeekday={worstWeekday} moodCorrelation={moodCorrelation} />

        {cards.length > 0 && (
          <div>
            <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">
              {t("stats.trend")}
            </div>
            <TrendBars points={trend} />
          </div>
        )}

        {categories.length > 0 && (
          <div>
            <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">
              {t("stats.byCategory")}
            </div>
            <CategoryBars categories={categories} />
          </div>
        )}

        {cards.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {cards.map((card) => (
              <div
                key={card.habitId}
                className="flex items-center justify-between border-b border-border py-2.5"
              >
                <div className="text-[13px] font-semibold">{card.name}</div>
                <div className="flex gap-4 text-right text-[11px] text-muted">
                  <span>7d {card.pct7}%</span>
                  <span>30d {card.pct30}%</span>
                  <span>90d {card.pct90}%</span>
                  <span className="font-serif font-semibold text-text">
                    🔥{card.currentStreak}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
