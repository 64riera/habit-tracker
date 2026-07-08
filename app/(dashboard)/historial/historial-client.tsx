"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { Heatmap } from "@/components/heatmap/heatmap";
import { CalendarMonth } from "@/components/heatmap/calendar-month";
import { Select } from "@/components/ui/select";
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

      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5">
        <div className="flex flex-wrap gap-2">
          <Select
            variant="pill"
            value={selectedHabit}
            onValueChange={(v) => updateQuery({ habit: v })}
            ariaLabel={t("history.filterHabit")}
            placeholder={t("history.filterHabit")}
            options={[{ value: "", label: t("history.filterHabit") }, ...habits.map((h) => ({ value: h.id, label: h.name }))]}
          />
          <Select
            variant="pill"
            value={selectedCategory}
            onValueChange={(v) => updateQuery({ category: v })}
            ariaLabel={t("history.filterCategory")}
            placeholder={t("history.filterCategory")}
            options={[
              { value: "", label: t("history.filterCategory") },
              ...categories.map((c) => ({ value: c.id, label: categoryDisplayName(c, locale) })),
            ]}
          />
          <Select
            variant="pill"
            value={selectedRange}
            onValueChange={(v) => updateQuery({ range: v })}
            ariaLabel={t("common.filter")}
            options={["30", "90", "365"].map((r) => ({ value: r, label: `${r} ${t("common.days")}` }))}
          />
        </div>
        <div className="flex gap-2">
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
      </div>

      <div className="mb-6">
        <div className="mb-2 text-[10px] tracking-wide text-muted uppercase">
          {t("history.heatmap")}
        </div>
        <Heatmap cells={heatmap} />
      </div>

      {/* Calendario (angosto y de alto fijo) al lado del registro (la lista
          más larga) desde lg: el ancho de la página deja de tener sentido
          repartido en una sola columna una vez que hay espacio de sobra. En
          mobile/tablet siguen apilados, calendario primero, igual que antes. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] lg:items-start lg:gap-8">
        <CalendarMonth cells={calendar} monthLabel={monthLabel} today={today} />

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
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border py-2.5"
                  >
                    <div className="w-16 shrink-0 text-[11px] text-muted">
                      {entry.date.slice(5)}
                    </div>
                    <div className="min-w-[120px] shrink-0 text-[12.5px] font-semibold">
                      {entry.habitName}
                    </div>
                    <div
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium text-muted"
                      style={{ background: "color-mix(in srgb, var(--color-text) 6%, transparent)" }}
                    >
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
