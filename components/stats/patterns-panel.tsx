"use client";

import { useI18n } from "@/lib/i18n/client";
import type { MoodCorrelation, WorstWeekday } from "@/lib/queries/patterns";

/** Long name of the ISO weekday (1=Monday..7=Sunday) in the active locale. */
function weekdayName(weekday: number, locale: string): string {
  // 2024-01-01 was a Monday; adding (weekday - 1) days gives each day of that reference week.
  const reference = new Date(2024, 0, 1 + (weekday - 1));
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", { weekday: "long" }).format(
    reference
  );
}

export function PatternsPanel({
  worstWeekday,
  moodCorrelation,
}: {
  worstWeekday: WorstWeekday;
  moodCorrelation: MoodCorrelation;
}) {
  const { t, locale } = useI18n();

  if (!worstWeekday && !moodCorrelation) return null;

  return (
    <div className="flex flex-wrap gap-2.5">
      {worstWeekday && (
        <div className="flex-1 rounded-xl border border-border p-3.5" style={{ minWidth: 180 }}>
          <div className="text-[10px] tracking-wide text-muted uppercase">
            {t("stats.worstWeekday")}
          </div>
          <div className="mt-1.5 font-serif-italic text-base font-semibold capitalize">
            {weekdayName(worstWeekday.weekday, locale)}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {Math.round(worstWeekday.missRate * 100)}%
          </div>
        </div>
      )}
      {moodCorrelation && (
        <div className="flex-1 rounded-xl border border-border p-3.5" style={{ minWidth: 180 }}>
          <div className="text-[10px] tracking-wide text-muted uppercase">
            {t("stats.moodCorrelation")}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-serif-italic text-base font-semibold">
              {moodCorrelation.lowMoodMissRate}%
            </span>
            <span className="text-[11px] text-muted">
              vs {moodCorrelation.highMoodMissRate}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
