"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PeriodSelector } from "@/components/finance/period-selector";
import { TrendBars } from "@/components/charts/trend-bars";
import { periodRange, type Period } from "@/lib/date";
import { exerciseProgress } from "@/lib/gym/stats";
import type { GymSessionRow } from "@/lib/queries/gym";
import type { GymExerciseCatalogRow } from "@/lib/queries/gym-exercises";

/** Weight/sets progression for one exercise at a time, filtered by period —
 * self-contained (owns its own exercise + period selection) so the parent
 * only has to mount it. Reuses SearchableSelect (same exercise picker as
 * gym-session-form.tsx), Finance's PeriodSelector (pure date-range pills,
 * nothing Finance-specific about it), and TrendBars (same bar chart already
 * used by the volume trend and top-exercises sections on this page). */
export function ExerciseProgressChart({
  sessions,
  exercises,
  defaultExerciseId,
  today,
}: {
  sessions: GymSessionRow[];
  exercises: GymExerciseCatalogRow[];
  defaultExerciseId: string;
  today: string;
}) {
  const { t, locale } = useI18n();
  const [exerciseId, setExerciseId] = useState(defaultExerciseId);
  const [period, setPeriod] = useState<Period>("month");
  const [customRange, setCustomRange] = useState({ from: today, to: today });

  const catalogOptions = useMemo(
    () => exercises.map((e) => ({ value: e.id, label: categoryDisplayName(e, locale) })),
    [exercises, locale]
  );
  const { from, to } = periodRange(period, today, customRange);
  const points = useMemo(() => exerciseProgress(sessions, exerciseId, from, to), [sessions, exerciseId, from, to]);
  const hasWeightData = points.some((p) => p.maxWeight !== null);

  return (
    <div className="flex flex-col gap-3">
      <SearchableSelect
        value={exerciseId}
        onValueChange={setExerciseId}
        options={catalogOptions}
        ariaLabel={t("gym.stats.exercise")}
        searchPlaceholder={t("gym.searchExercise")}
        emptyLabel={t("gym.noExerciseMatch")}
      />
      <PeriodSelector
        period={period}
        onPeriodChange={setPeriod}
        customFrom={customRange.from}
        customTo={customRange.to}
        onCustomChange={(rangeFrom, rangeTo) => setCustomRange({ from: rangeFrom, to: rangeTo })}
      />

      {points.length === 0 ? (
        <p className="text-sm text-muted">{t("gym.stats.progressEmpty")}</p>
      ) : (
        <>
          {hasWeightData && (
            <div>
              <div className="mb-2 text-[10px] tracking-wide text-muted uppercase">{t("gym.stats.weightProgress")}</div>
              <TrendBars
                points={points.map((p) => ({ date: p.date, value: p.maxWeight ?? 0 }))}
                formatLabel={(p) => t("gym.stats.weightBarLabel", { date: p.date, weight: String(p.value) })}
                highlightColor="var(--color-cat-fitness)"
              />
            </div>
          )}
          <div>
            <div className="mb-2 text-[10px] tracking-wide text-muted uppercase">{t("gym.stats.setsProgress")}</div>
            <TrendBars
              points={points.map((p) => ({ date: p.date, value: p.setCount }))}
              formatLabel={(p) => t("gym.stats.setsBarLabel", { date: p.date, sets: String(p.value) })}
              highlightColor="var(--color-cat-fitness)"
            />
          </div>
        </>
      )}
    </div>
  );
}
