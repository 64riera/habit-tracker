"use client";

import { useI18n } from "@/lib/i18n/client";
import type { WeekdayExpense } from "@/lib/finance/aggregate";

/** Which day of the week you tend to spend the most on — a question the
 * period totals and category breakdown can't answer, since both collapse
 * the whole range into one number. Bars stay monochrome (day-of-week isn't
 * tied to a category) except the peak, which carries the accent — the chart
 * makes the peak visible, the caption underneath says it in words so the
 * insight lands even at a glance. */
export function WeekdayPattern({ data }: { data: WeekdayExpense[] }) {
  const { t } = useI18n();
  const max = Math.max(1, ...data.map((d) => d.total));
  const peak = data.reduce((a, b) => (b.total > a.total ? b : a), data[0]);
  const isFlat = peak.total <= 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        {data.map((d) => {
          const isPeak = !isFlat && d.weekday === peak.weekday;
          const heightPct = Math.max((d.total / max) * 100, 4);
          return (
            <div key={d.weekday} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-16 w-full items-end">
                <div
                  className="w-full rounded-t-[3px]"
                  style={{
                    height: `${heightPct}%`,
                    background: isPeak ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 18%, transparent)",
                  }}
                />
              </div>
              <div className="text-[10px] font-medium text-muted">{t(`habit.weekdayShort.${d.weekday}`)}</div>
            </div>
          );
        })}
      </div>
      {!isFlat && (
        <p className="text-[12.5px] text-muted">
          {t("finance.insights.weekdayInsightHigh", { day: t(`finance.insights.weekdayLong.${peak.weekday}`) })}
        </p>
      )}
    </div>
  );
}
