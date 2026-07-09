"use client";

import { ContentHeader } from "@/components/nav/content-header";
import { SegmentedRouteTabs } from "@/components/nav/segmented-route-tabs";
import { TrendBars } from "@/components/charts/trend-bars";
import { CategoryBars } from "@/components/charts/category-bars";
import { MetricSummaryCard } from "@/components/stats/metric-summary-card";
import { useI18n } from "@/lib/i18n/client";
import { formatMinutesShort } from "@/lib/focus/format";
import type {
  FocusHabitStat,
  FocusOverallTotals,
  FocusPeriodComparison,
  FocusTimeOfDayStat,
  FocusTrendPoint,
} from "@/lib/queries/focus-stats";

const FOCUS_TABS = [
  { key: "historial", href: "/enfoque/historial", dictKey: "nav.historial" },
  { key: "estadisticas", href: "/enfoque/estadisticas", dictKey: "nav.estadisticas" },
] as const;

/** Sin colores por categoría (a diferencia de las barras de hábitos): un
 * solo tono suave y monocromo, coherente con que --color-accent y
 * --color-text son literalmente el mismo valor en este sistema. */
const BAR_COLOR = "color-mix(in srgb, var(--color-text) 65%, transparent)";

export function FocusEstadisticasClient({
  overall,
  trend,
  weekSummary,
  monthSummary,
  habitBreakdown,
  timeOfDay,
  streak,
}: {
  overall: FocusOverallTotals;
  trend: FocusTrendPoint[];
  weekSummary: FocusPeriodComparison;
  monthSummary: FocusPeriodComparison;
  habitBreakdown: FocusHabitStat[];
  timeOfDay: FocusTimeOfDayStat[];
  streak: { current: number; longest: number };
}) {
  const { t } = useI18n();
  const hasAnyData = overall.minutes90 > 0;

  const summaryCards = [
    { value: overall.minutes7, label: t("stats.last7") },
    { value: overall.minutes30, label: t("stats.last30") },
    { value: overall.minutes90, label: t("stats.last90") },
  ];

  function periodDelta(comparison: FocusPeriodComparison, vsLabelKey: string) {
    const { minutesChange } = comparison;
    const sign = minutesChange > 0 ? "+" : minutesChange < 0 ? "-" : "";
    return {
      text: `${sign}${formatMinutesShort(Math.abs(minutesChange))} ${t(vsLabelKey)}`,
      positive: minutesChange >= 0,
    };
  }

  function streakLabel(count: number) {
    return `${count} ${count === 1 ? t("common.day") : t("common.days")}`;
  }

  return (
    <div>
      <ContentHeader titleKey="focus.stats.title" subtitleKey="screens.enfoque.subtitle" backHref="/enfoque" />
      <SegmentedRouteTabs tabs={FOCUS_TABS} />

      <div className="flex flex-col gap-6">
        <div className="flex">
          {summaryCards.map((c, i) => (
            <div key={i} className="flex-1 border-l border-border px-4 first:border-l-0 first:pl-0 md:px-[22px]">
              <div className="font-serif-italic text-2xl font-semibold md:text-[30px]">
                {formatMinutesShort(c.value)}
              </div>
              <div className="mt-1 text-[11.5px] text-muted">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <MetricSummaryCard
            title={t("stats.weeklySummary")}
            value={formatMinutesShort(weekSummary.current.totalMinutes)}
            delta={periodDelta(weekSummary, "stats.vsLastWeek")}
            secondaryStats={[
              { label: t("focus.stats.sessions"), value: String(weekSummary.current.completedCount) },
              { label: t("focus.stats.completionRate"), value: `${weekSummary.current.completionRatePct}%` },
            ]}
          />
          <MetricSummaryCard
            title={t("stats.monthlySummary")}
            value={formatMinutesShort(monthSummary.current.totalMinutes)}
            delta={periodDelta(monthSummary, "stats.vsLastMonth")}
            secondaryStats={[
              { label: t("focus.stats.sessions"), value: String(monthSummary.current.completedCount) },
              { label: t("focus.stats.completionRate"), value: `${monthSummary.current.completionRatePct}%` },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <StatMini label={t("focus.stats.currentStreak")} value={streakLabel(streak.current)} />
          <StatMini label={t("focus.stats.longestStreak")} value={streakLabel(streak.longest)} />
          <StatMini
            label={t("focus.stats.avgSession")}
            value={formatMinutesShort(monthSummary.current.avgSessionMinutes)}
          />
          <StatMini
            label={t("focus.stats.longestSession")}
            value={formatMinutesShort(monthSummary.current.longestSessionMinutes)}
          />
        </div>

        {hasAnyData ? (
          <>
            <div>
              <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">{t("stats.trend")}</div>
              <TrendBars
                points={trend.map((p) => ({ date: p.date, value: p.minutes }))}
                formatLabel={(p) => `${p.date}: ${formatMinutesShort(p.value)}`}
              />
            </div>

            {habitBreakdown.length > 0 && (
              <div>
                <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">{t("focus.stats.byHabit")}</div>
                <CategoryBars
                  items={habitBreakdown.map((h) => ({
                    key: h.habitId,
                    label: h.habitName,
                    value: h.totalMinutes,
                    color: BAR_COLOR,
                  }))}
                  formatValue={formatMinutesShort}
                />
              </div>
            )}

            <div>
              <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">
                {t("focus.stats.byTimeOfDay")}
              </div>
              <CategoryBars
                items={timeOfDay.map((b) => ({
                  key: b.bucket,
                  label: t(`focus.stats.timeOfDay.${b.bucket}`),
                  value: b.minutes,
                  color: BAR_COLOR,
                }))}
                formatValue={formatMinutesShort}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">{t("focus.stats.empty")}</p>
        )}
      </div>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border p-3.5" style={{ minWidth: 150 }}>
      <div className="text-[10px] tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1.5 font-serif-italic text-base font-semibold">{value}</div>
    </div>
  );
}
