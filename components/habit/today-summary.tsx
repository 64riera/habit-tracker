"use client";

import { useI18n } from "@/lib/i18n/client";
import { useTextScramble } from "@/lib/hooks/use-text-scramble";
import { useTodaySummary } from "./today-summary-context";

/** Animated mirror of %, summary and best streak — see TodaySummaryProvider
 * for why it lives outside the list's Suspense boundary. The % and streak
 * are revealed with a text scramble when they change; the bar animates via
 * a CSS `width` transition (this only works because this component doesn't
 * remount when the day changes, so the browser has a previous value to
 * start from). The "N of M completed" line updates instantly, without a
 * scramble — it's supporting metadata, not the focus of the animation. */
export function TodaySummaryDisplay() {
  const { t } = useI18n();
  const { summary } = useTodaySummary();

  const pct = summary?.pct ?? 0;
  const pctText = useTextScramble(`${pct}%`, "digits");

  const streakLine = summary?.bestStreak
    ? t("checkin.bestStreak", { days: summary.bestStreak.days, habit: summary.bestStreak.habitName })
    : "";
  const streakText = useTextScramble(streakLine, "alpha");

  if (!summary || summary.total === 0) return null;

  const summaryLine =
    summary.inProgress > 0
      ? t("checkin.summaryWithProgress", { done: summary.done, total: summary.total, inProgress: summary.inProgress })
      : t("checkin.summary", { done: summary.done, total: summary.total });

  return (
    <div className="flex flex-col gap-4 mb-4 md:gap-[22px] md:mb-[22px]">
      <div>
        <div className="flex items-baseline gap-3.5">
          <div className="font-serif-italic text-[34px] font-semibold tabular-nums md:text-[38px]">
            {pctText}
          </div>
          <div className="text-xs text-muted md:text-[13px]">{summaryLine}</div>
        </div>
        <div className="mt-2.5 h-0.5 rounded-full bg-border md:mt-3">
          <div
            className="h-0.5 rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${summary.pct}%` }}
          />
        </div>
      </div>

      {streakLine && (
        <div className="text-right font-serif-italic text-xs text-muted md:text-left">{streakText}</div>
      )}
    </div>
  );
}
