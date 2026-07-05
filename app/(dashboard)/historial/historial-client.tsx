"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { Heatmap } from "@/components/heatmap/heatmap";
import { CalendarMonth } from "@/components/heatmap/calendar-month";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { parseISODate } from "@/lib/date";
import type { CategoryRow, HabitWithExtras } from "@/lib/queries/habits";
import type { CalendarCell, DayCell, LogEntry } from "@/lib/queries/history";

export function HistorialClient({
  habits,
  categories,
  heatmap,
  calendar,
  log,
  selectedHabit,
  selectedCategory,
  selectedRange,
  today,
}: {
  habits: HabitWithExtras[];
  categories: CategoryRow[];
  heatmap: DayCell[];
  calendar: CalendarCell[];
  log: LogEntry[];
  selectedHabit: string;
  selectedCategory: string;
  selectedRange: string;
  today: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [entries, setEntries] = useState(log);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(log.length < 20);

  const monthLabel = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(parseISODate(today));

  function updateQuery(next: { habit?: string; category?: string; range?: string }) {
    const params = new URLSearchParams();
    const habit = next.habit ?? selectedHabit;
    const category = next.category ?? selectedCategory;
    const range = next.range ?? selectedRange;
    if (habit) params.set("habit", habit);
    if (category) params.set("category", category);
    if (range && range !== "90") params.set("range", range);
    const qs = params.toString();
    router.push(qs ? `/historial?${qs}` : "/historial");
  }

  async function loadMore() {
    setLoadingMore(true);
    const params = new URLSearchParams({ offset: String(entries.length) });
    if (selectedHabit) params.set("habit", selectedHabit);
    if (selectedCategory) params.set("category", selectedCategory);
    const res = await fetch(`/api/log?${params.toString()}`);
    const data = await res.json();
    setEntries((prev) => [...prev, ...data.log]);
    if (data.log.length < 20) setExhausted(true);
    setLoadingMore(false);
  }

  const exportParams = new URLSearchParams();
  if (selectedHabit) exportParams.set("habit", selectedHabit);
  if (selectedCategory) exportParams.set("category", selectedCategory);

  return (
    <div>
      <ContentHeader titleKey="screens.historial.title" subtitleKey="screens.historial.subtitle" />

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={selectedHabit}
          onChange={(e) => updateQuery({ habit: e.target.value })}
          className="rounded-full border border-border bg-transparent px-3 py-1.5 text-[11px] font-medium"
        >
          <option value="">{t("history.filterHabit")}</option>
          {habits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <select
          value={selectedCategory}
          onChange={(e) => updateQuery({ category: e.target.value })}
          className="rounded-full border border-border bg-transparent px-3 py-1.5 text-[11px] font-medium"
        >
          <option value="">{t("history.filterCategory")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryDisplayName(c, locale)}
            </option>
          ))}
        </select>
        <select
          value={selectedRange}
          onChange={(e) => updateQuery({ range: e.target.value })}
          className="rounded-full border border-border bg-transparent px-3 py-1.5 text-[11px] font-medium"
        >
          <option value="30">30 {t("common.days")}</option>
          <option value="90">90 {t("common.days")}</option>
          <option value="365">365 {t("common.days")}</option>
        </select>
        <a
          href={`/api/export?format=csv&${exportParams.toString()}`}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted"
        >
          <Download size={12} strokeWidth={2.2} aria-hidden />
          {t("history.exportCsv")}
        </a>
        <a
          href={`/api/export?format=json&${exportParams.toString()}`}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted"
        >
          <Download size={12} strokeWidth={2.2} aria-hidden />
          {t("history.exportJson")}
        </a>
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
          {entries.length === 0 ? (
            <p className="text-sm text-muted">{t("history.empty")}</p>
          ) : (
            <>
              <div className="flex flex-col">
                {entries.map((entry) => (
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
                    {entry.mood && (
                      <div className="shrink-0 text-[11px]">
                        {["😞", "🙁", "😐", "🙂", "😄"][entry.mood - 1]}
                      </div>
                    )}
                    {entry.note && (
                      <div className="min-w-0 font-serif-italic text-xs text-muted">
                        {entry.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!exhausted && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="mt-3 w-full rounded-lg border border-border py-2 text-xs text-muted disabled:opacity-60"
                >
                  {loadingMore ? t("common.loading") : "···"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
