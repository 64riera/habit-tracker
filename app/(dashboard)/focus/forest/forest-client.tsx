"use client";

import { useState } from "react";
import { ContentHeader } from "@/components/nav/content-header";
import { PillTabs } from "@/components/ui/pill-tabs";
import { TreeGrid, TIER_ICON } from "@/components/focus/tree-grid";
import { TierTimeline } from "@/components/focus/tier-timeline";
import { Heatmap } from "@/components/heatmap/heatmap";
import { TrendBars, type TrendBarPoint } from "@/components/charts/trend-bars";
import { MetricSummaryCard } from "@/components/stats/metric-summary-card";
import { useI18n } from "@/lib/i18n/client";
import { usePageData } from "@/lib/swr/use-page-data";
import { swrKeys } from "@/lib/swr/keys";
import { fetchFocusForestAction } from "@/lib/actions/focus-forest-read";
import { formatDeltaValue } from "@/lib/format/delta";
import { formatMinutesShort } from "@/lib/focus/format";
import { HOUR_TIERS, SESSION_COUNT_TIERS, type FocusRewardTier } from "@/lib/focus/rewards";
import type { FocusForestData, ForestPeriodData, ForestTotalData, ForestYearData } from "@/lib/queries/focus-forest";

type Tab = "week" | "month" | "year" | "total";

function periodDelta(pct: number | null, deltaLabelKey: string, t: (key: string) => string) {
  if (pct === null) return undefined;
  return { text: `${formatDeltaValue(pct)} ${t(deltaLabelKey)}`, positive: pct >= 0 };
}

function ForestPeriodPanel({ data, deltaLabelKey }: { data: ForestPeriodData; deltaLabelKey: string }) {
  const { t } = useI18n();
  const trendPoints: TrendBarPoint[] = data.trend.map((p) => ({ date: p.date, value: p.minutes }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">
          {t("focus.rewards.periodTreesTitle")}
        </div>
        <TreeGrid
          trees={data.trees}
          emptyTitleKey="focus.rewards.emptyPeriodTitle"
          emptyBodyKey="focus.rewards.emptyPeriodBody"
          emptyCtaKey="focus.rewards.emptyPeriodCta"
        />
      </div>

      <MetricSummaryCard
        title={t("focus.rewards.totalHours")}
        value={formatMinutesShort(data.totalMinutes)}
        delta={periodDelta(data.minutesChangePct, deltaLabelKey, t)}
        secondaryStats={[
          { label: t("focus.rewards.totalSessions"), value: String(data.sessionCount) },
          { label: t("focus.rewards.activeDaysLabel"), value: String(data.activeDays) },
        ]}
      />

      {data.trend.some((p) => p.minutes > 0) && (
        <TrendBars points={trendPoints} formatLabel={(p) => `${p.date}: ${formatMinutesShort(p.value)}`} />
      )}
    </div>
  );
}

function ForestYearPanel({ data }: { data: ForestYearData }) {
  const { t, locale } = useI18n();
  const monthFormatter = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", { month: "short" });
  const formatMonthLabel = (monthKey: string) => {
    const [y, m] = monthKey.split("-").map(Number);
    return monthFormatter.format(new Date(y, m - 1, 1));
  };
  const trendPoints: TrendBarPoint[] = data.monthlyTrend.map((m) => ({ date: m.monthKey, value: m.minutes }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">
          {t("focus.rewards.yearHeatmapTitle")}
        </div>
        <Heatmap cells={data.heatmap} />
      </div>

      <MetricSummaryCard
        title={t("focus.rewards.totalHours")}
        value={formatMinutesShort(data.totalMinutes)}
        delta={periodDelta(data.minutesChangePct, "focus.rewards.vsPreviousYear", t)}
        secondaryStats={[
          { label: t("focus.rewards.totalSessions"), value: String(data.sessionCount) },
          { label: t("focus.rewards.activeDaysLabel"), value: String(data.activeDays) },
        ]}
      />

      {trendPoints.some((p) => p.value > 0) && (
        <TrendBars
          points={trendPoints}
          formatLabel={(p) => `${formatMonthLabel(p.date)}: ${formatMinutesShort(p.value)}`}
        />
      )}
    </div>
  );
}

function MilestoneBadge({
  tier,
  unlocked,
  requirement,
  t,
}: {
  tier: FocusRewardTier;
  unlocked: boolean;
  requirement: string;
  t: (key: string) => string;
}) {
  const Icon = TIER_ICON[tier];
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3.5 text-center"
      style={{
        borderColor: unlocked ? "var(--color-accent)" : "var(--color-border)",
        borderStyle: unlocked ? "solid" : "dashed",
        background: unlocked ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "transparent",
        opacity: unlocked ? 1 : 0.5,
        minWidth: 116,
      }}
    >
      <Icon size={22} strokeWidth={1.5} color={unlocked ? "var(--color-accent)" : "var(--color-muted)"} aria-hidden />
      <span
        className="text-[12.5px] font-semibold"
        style={{ color: unlocked ? "var(--color-accent)" : "var(--color-muted)" }}
      >
        {t(`focus.rewards.types.${tier}`)}
      </span>
      <span className="text-[10px] text-muted">{requirement}</span>
    </div>
  );
}

function ForestTotalPanel({ data }: { data: ForestTotalData }) {
  const { t } = useI18n();
  const unlocked = new Set<FocusRewardTier>(data.unlockedTiers.map((u) => u.tier));
  const totalHours = data.totalCompletedSeconds / 3600;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex gap-8">
        <div>
          <div className="font-serif-italic text-[28px] font-semibold tabular-nums">{totalHours.toFixed(1)}</div>
          <div className="text-[11px] text-muted">{t("focus.rewards.totalHours")}</div>
        </div>
        <div>
          <div className="font-serif-italic text-[28px] font-semibold tabular-nums">
            {data.completedSessionCount}
          </div>
          <div className="text-[11px] text-muted">{t("focus.rewards.totalSessions")}</div>
        </div>
      </div>

      <div>
        <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">{t("focus.rewards.treeTitle")}</div>
        <div className="flex flex-wrap gap-2.5">
          {HOUR_TIERS.map(({ tier, hours }) => (
            <MilestoneBadge
              key={tier}
              tier={tier}
              unlocked={unlocked.has(tier)}
              requirement={t("focus.rewards.hoursRequirement", { hours })}
              t={t}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">{t("focus.rewards.forestTitle")}</div>
        <div className="flex flex-wrap gap-2.5">
          {SESSION_COUNT_TIERS.map(({ tier, sessions }) => (
            <MilestoneBadge
              key={tier}
              tier={tier}
              unlocked={unlocked.has(tier)}
              requirement={t("focus.rewards.sessionsRequirement", { sessions })}
              t={t}
            />
          ))}
        </div>
      </div>

      <TierTimeline tiers={data.unlockedTiers} />
    </div>
  );
}

export function BosqueClient({ data: initialData, today }: { data: FocusForestData; today: string }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("week");
  const { data } = usePageData(swrKeys.focusForest(today), () => fetchFocusForestAction(today), initialData);

  const tabs: { value: Tab; label: string }[] = [
    { value: "week", label: t("focus.rewards.periodWeek") },
    { value: "month", label: t("focus.rewards.periodMonth") },
    { value: "year", label: t("focus.rewards.periodYear") },
    { value: "total", label: t("focus.rewards.periodTotal") },
  ];

  return (
    <div>
      <ContentHeader titleKey="focus.rewards.title" subtitleKey="focus.rewards.subtitle" backHref="/focus" />

      <div className="mb-6">
        <PillTabs options={tabs} value={tab} onChange={setTab} ariaLabel={t("focus.rewards.title")} />
      </div>

      {tab === "week" && <ForestPeriodPanel data={data.week} deltaLabelKey="focus.rewards.vsPreviousWeek" />}
      {tab === "month" && <ForestPeriodPanel data={data.month} deltaLabelKey="focus.rewards.vsPreviousMonth" />}
      {tab === "year" && <ForestYearPanel data={data.year} />}
      {tab === "total" && <ForestTotalPanel data={data.total} />}
    </div>
  );
}
