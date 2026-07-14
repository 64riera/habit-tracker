"use client";

import { useMemo } from "react";
import { ContentHeader } from "@/components/nav/content-header";
import { TrendBars } from "@/components/charts/trend-bars";
import { CategoryBars } from "@/components/charts/category-bars";
import { MetricSummaryCard } from "@/components/stats/metric-summary-card";
import { StatMini } from "@/components/stats/stat-mini";
import { PersonalRecordsList } from "@/components/gym/personal-records-list";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { formatVolume } from "@/lib/gym/format";
import { swrKeys } from "@/lib/swr/keys";
import { usePageData } from "@/lib/swr/use-page-data";
import { fetchGymSessionsAction } from "@/lib/actions/gym-read";
import { fetchGymExercisesAction } from "@/lib/actions/gym-exercises-read";
import {
  overallSessionCounts,
  getGymWeekSummary,
  getGymMonthSummary,
  gymTrend,
  exerciseBreakdown,
  gymStreak,
  summarizeSessions,
  type GymPeriodComparison,
} from "@/lib/gym/stats";
import type { GymSessionRow } from "@/lib/queries/gym";
import type { GymExerciseCatalogRow } from "@/lib/queries/gym-exercises";

/** Bars tinted with Gym's own identity color (already used for its nav icon
 * and list rows) instead of Focus's neutral monochrome — ties this stats
 * page back to the rest of the section instead of reading as a generic
 * clone. */
const BAR_COLOR = "color-mix(in srgb, var(--color-cat-fitness) 65%, transparent)";

export function GymEstadisticasClient({
  sessions: initialSessions,
  exercises: initialExercises,
  today,
}: {
  sessions: GymSessionRow[];
  exercises: GymExerciseCatalogRow[];
  today: string;
}) {
  const { t, locale } = useI18n();
  const { data: sessions } = usePageData(swrKeys.gymSessions(), fetchGymSessionsAction, initialSessions);
  const { data: exercises } = usePageData(swrKeys.gymExercises(), fetchGymExercisesAction, initialExercises);
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const exerciseName = (exerciseId: string) => categoryDisplayName(exercisesById.get(exerciseId), locale);

  const overall = useMemo(() => overallSessionCounts(sessions, today), [sessions, today]);
  const weekSummary = useMemo(() => getGymWeekSummary(sessions, today), [sessions, today]);
  const monthSummary = useMemo(() => getGymMonthSummary(sessions, today), [sessions, today]);
  const trend = useMemo(() => gymTrend(sessions, today, 30), [sessions, today]);
  const breakdown = useMemo(() => exerciseBreakdown(sessions), [sessions]);
  const streak = useMemo(() => gymStreak(sessions, today), [sessions, today]);
  const allTime = useMemo(() => summarizeSessions(sessions), [sessions]);

  const hasAnyData = sessions.length > 0;
  const favoriteExercise = breakdown[0] ? exerciseName(breakdown[0].exerciseId) : null;
  const topExercises = breakdown.slice(0, 8);
  const personalRecords = useMemo(
    () =>
      breakdown
        .filter((e) => e.bestWeight !== null)
        .sort((a, b) => b.bestWeight! - a.bestWeight!)
        .slice(0, 6)
        .map((e) => ({ ...e, name: exerciseName(e.exerciseId) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [breakdown, exercisesById, locale]
  );

  function volumeDelta(comparison: GymPeriodComparison, vsLabelKey: string) {
    const { volumeChange } = comparison;
    const sign = volumeChange > 0 ? "+" : volumeChange < 0 ? "-" : "";
    return {
      text: `${sign}${formatVolume(Math.abs(volumeChange), locale)} ${t(vsLabelKey)}`,
      positive: volumeChange >= 0,
    };
  }

  function weeksLabel(count: number) {
    return `${count} ${count === 1 ? t("gym.stats.week") : t("gym.stats.weeks")}`;
  }

  const summaryCards = [
    { value: overall.sessions7, label: t("stats.last7") },
    { value: overall.sessions30, label: t("stats.last30") },
    { value: overall.sessions90, label: t("stats.last90") },
  ];

  return (
    <div>
      <ContentHeader titleKey="gym.stats.title" subtitleKey="screens.gym.subtitle" backHref="/gym" />

      {hasAnyData ? (
        <div className="flex flex-col gap-6">
          <div className="flex">
            {summaryCards.map((c, i) => (
              <div key={i} className="flex-1 border-l border-border px-4 first:border-l-0 first:pl-0 md:px-[22px]">
                <div className="font-serif-italic text-2xl font-semibold md:text-[30px]">{c.value}</div>
                <div className="mt-1 text-[11.5px] text-muted">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <MetricSummaryCard
              title={t("stats.weeklySummary")}
              value={formatVolume(weekSummary.current.volume, locale)}
              delta={volumeDelta(weekSummary, "stats.vsLastWeek")}
              secondaryStats={[
                { label: t("gym.stats.sessions"), value: String(weekSummary.current.sessionCount) },
                { label: t("gym.stats.sets"), value: String(weekSummary.current.setCount) },
              ]}
            />
            <MetricSummaryCard
              title={t("stats.monthlySummary")}
              value={formatVolume(monthSummary.current.volume, locale)}
              delta={volumeDelta(monthSummary, "stats.vsLastMonth")}
              secondaryStats={[
                { label: t("gym.stats.sessions"), value: String(monthSummary.current.sessionCount) },
                { label: t("gym.stats.sets"), value: String(monthSummary.current.setCount) },
              ]}
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <StatMini label={t("gym.stats.currentStreak")} value={weeksLabel(streak.current)} />
            <StatMini label={t("gym.stats.longestStreak")} value={weeksLabel(streak.longest)} />
            <StatMini label={t("gym.stats.totalVolume")} value={formatVolume(allTime.volume, locale)} />
            {favoriteExercise && <StatMini label={t("gym.stats.favoriteExercise")} value={favoriteExercise} />}
          </div>

          <div>
            <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">{t("gym.stats.volumeTrend")}</div>
            <TrendBars
              points={trend.map((p) => ({ date: p.date, value: p.volume }))}
              formatLabel={(p) => `${p.date}: ${formatVolume(p.value, locale)}`}
              highlightColor="var(--color-cat-fitness)"
            />
          </div>

          {topExercises.length > 0 && (
            <div>
              <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">
                {t("gym.stats.topExercises")}
              </div>
              <CategoryBars
                items={topExercises.map((e) => ({
                  key: e.exerciseId,
                  label: exerciseName(e.exerciseId),
                  value: e.setCount,
                  color: BAR_COLOR,
                }))}
                formatValue={(v) => `${v}`}
              />
            </div>
          )}

          {personalRecords.length > 0 && (
            <div>
              <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">
                {t("gym.stats.personalRecords")}
              </div>
              <PersonalRecordsList records={personalRecords} />
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">{t("gym.stats.empty")}</p>
      )}
    </div>
  );
}
