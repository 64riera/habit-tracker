"use client";

import { useI18n } from "@/lib/i18n/client";
import { useTextScramble } from "@/lib/hooks/use-text-scramble";

/** Visual mirror of TodaySummaryDisplay (big % with scramble + thin bar),
 * but with data of its own from the focus module instead of reusing that
 * component, which is tied to the shape of habit data (total/done/
 * inProgress/bestStreak). */
export function FocusProgressWidget({
  completedSeconds,
  goalMinutes,
}: {
  completedSeconds: number;
  goalMinutes: number;
}) {
  const { t } = useI18n();
  const goalSeconds = goalMinutes * 60;
  const pct = goalSeconds > 0 ? Math.min(100, Math.round((completedSeconds / goalSeconds) * 100)) : 0;
  const doneMinutes = Math.floor(completedSeconds / 60);
  const pctText = useTextScramble(`${pct}%`, "digits");

  return (
    <div className="mb-4 flex flex-col gap-2.5 md:mb-[22px]">
      <div className="flex items-baseline gap-3.5">
        <div className="font-serif-italic text-[34px] font-semibold tabular-nums md:text-[38px]">{pctText}</div>
        <div className="text-xs text-muted md:text-[13px]">
          {t("focus.progress.summary", { done: doneMinutes, goal: goalMinutes })}
        </div>
      </div>
      <div className="h-0.5 rounded-full bg-border">
        <div
          className="h-0.5 rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
