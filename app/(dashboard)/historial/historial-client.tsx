"use client";

import { useRouter } from "next/navigation";
import { ContentHeader } from "@/components/nav/content-header";
import { Heatmap } from "@/components/heatmap/heatmap";
import { CalendarMonth } from "@/components/heatmap/calendar-month";
import { useI18n } from "@/lib/i18n/client";
import { parseISODate } from "@/lib/date";
import type { HabitWithExtras } from "@/lib/queries/habits";
import type { CalendarCell, DayCell, LogEntry } from "@/lib/queries/history";

export function HistorialClient({
  habits,
  heatmap,
  calendar,
  log,
  selectedHabit,
  today,
}: {
  habits: HabitWithExtras[];
  heatmap: DayCell[];
  calendar: CalendarCell[];
  log: LogEntry[];
  selectedHabit: string;
  today: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const monthLabel = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(parseISODate(today));

  function onFilterChange(value: string) {
    router.push(value ? `/historial?habit=${value}` : "/historial");
  }

  return (
    <div>
      <ContentHeader titleKey="screens.historial.title" subtitleKey="screens.historial.subtitle" />

      <div className="mb-4 flex gap-2.5">
        <select
          value={selectedHabit}
          onChange={(e) => onFilterChange(e.target.value)}
          className="rounded-full border border-border bg-transparent px-3 py-1.5 text-[11px] font-medium"
        >
          <option value="">{t("history.filterHabit")}</option>
          {habits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <span className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted">
          {t("history.filterRange")}
        </span>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-2 text-[10px] tracking-wide text-muted uppercase">
            {t("history.heatmap")}
          </div>
          <Heatmap cells={heatmap} />
        </div>

        <CalendarMonth cells={calendar} monthLabel={monthLabel} />

        <div>
          <div className="mb-2 text-[10px] tracking-wide text-muted uppercase">
            {t("history.log")}
          </div>
          {log.length === 0 ? (
            <p className="text-sm text-muted">{t("history.empty")}</p>
          ) : (
            <div className="flex flex-col">
              {log.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-baseline gap-3 border-b border-border py-2.5"
                >
                  <div className="w-14 shrink-0 text-[11px] text-muted">
                    {entry.date.slice(5)}
                  </div>
                  <div className="shrink-0 text-[12.5px] font-semibold">{entry.habitName}</div>
                  <div className="shrink-0 text-[11px] font-semibold text-muted">
                    {t(`checkin.logStatus.${entry.status}`)}
                  </div>
                  {entry.note && (
                    <div className="min-w-0 font-serif-italic text-xs text-muted">
                      {entry.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
