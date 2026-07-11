"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Pencil } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { SegmentedRouteTabs } from "@/components/nav/segmented-route-tabs";
import { FocusHeaderChip } from "@/components/focus/focus-header-chip";
import { Heatmap } from "@/components/heatmap/heatmap";
import { CalendarMonth } from "@/components/heatmap/calendar-month";
import { Select } from "@/components/ui/select";
import { StatusGlyph } from "@/components/habit/status-glyph";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { addDays, formatTimeOfDay, groupByDate, parseISODate } from "@/lib/date";
import type { CategoryRow, HabitWithExtras } from "@/lib/queries/habits";
import type { CalendarCell, DayCell, LogEntry } from "@/lib/queries/history";
import type { FocusHeaderData } from "@/lib/queries/focus";

const MOOD_EMOJI = ["😞", "🙁", "😐", "🙂", "😄"];

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
  focusHeader,
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
  focusHeader: FocusHeaderData;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [entries, setEntries] = useState(log);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(log.length < 20);

  const groups = useMemo(() => groupByDate(entries), [entries]);
  const categoryColorByHabit = useMemo(
    () => new Map(habits.map((h) => [h.id, h.category?.color])),
    [habits]
  );
  const activeDays = heatmap.filter((d) => d.level > 0).length;
  const yesterday = addDays(today, -1);

  const dayHeaderFormatter = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  function formatDayHeader(date: string) {
    if (date === today) return t("checkin.today");
    if (date === yesterday) return t("history.yesterday");
    return dayHeaderFormatter.format(parseISODate(date));
  }

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
    router.push(qs ? `/history?${qs}` : "/history");
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
      <ContentHeader
        titleKey="screens.historial.title"
        subtitleKey="screens.historial.subtitle"
        headerAccessory={<FocusHeaderChip session={focusHeader.session} soundEnabled={focusHeader.soundEnabled} />}
      />
      <SegmentedRouteTabs
        tabs={[
          { key: "historial", href: "/history", dictKey: "nav.historial" },
          { key: "estadisticas", href: "/stats", dictKey: "nav.estadisticas" },
        ]}
      />

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

      <div className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div className="text-[10px] tracking-wide text-muted uppercase">{t("history.heatmap")}</div>
          <div className="text-[11px] text-muted">
            {t("history.activeDays", { active: activeDays, total: heatmap.length })}
          </div>
        </div>
        <Heatmap cells={heatmap} />
      </div>

      {/* Calendar (narrow, fixed height) next to the log (the longer list)
          from lg onward: the page width stops making sense spread over a
          single column once there's plenty of room to spare. On
          mobile/tablet they stay stacked, calendar first, same as before. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] lg:items-start lg:gap-8">
        <CalendarMonth cells={calendar} monthLabel={monthLabel} today={today} />

        <div>
          <div className="mb-2 text-[10px] tracking-wide text-muted uppercase">
            {t("history.log")}
          </div>
          {groups.length === 0 ? (
            <p className="text-sm text-muted">{t("history.empty")}</p>
          ) : (
            <>
              {/* One header per day instead of repeating the date on every
                  row: the natural unit of a daily log is the day, not the
                  individual entry — this way it reads like a diary, not a
                  flat table. Each day is also the entry point to correct it
                  (the same date-based check-in mechanism as Home and the
                  calendar). */}
              <div className="flex flex-col gap-6">
                {groups.map((group) => (
                  <div key={group.date}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <div className="font-serif-italic text-[15px] leading-tight">
                        {formatDayHeader(group.date)}
                      </div>
                      <Link
                        href={`/?fecha=${group.date}`}
                        className="flex shrink-0 items-center gap-1 text-[10.5px] font-medium text-muted"
                      >
                        <Pencil size={10} strokeWidth={2.2} aria-hidden />
                        {t("history.logDay")}
                      </Link>
                    </div>
                    <div className="flex flex-col">
                      {group.items.map((entry) => {
                        const color = categoryColorByHabit.get(entry.habitId) ?? "var(--color-muted)";
                        return (
                          <div
                            key={entry.id}
                            className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-border py-2"
                          >
                            <StatusGlyph status={entry.status} />
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                            <span className="shrink-0 text-[12.5px] font-medium">{entry.habitName}</span>
                            <span className="shrink-0 text-[11px] text-muted">
                              {t(`checkin.logStatus.${entry.status}`)}
                            </span>
                            {entry.status === "done" && entry.completedAt && (
                              <span className="shrink-0 text-[11px] text-muted">
                                {formatTimeOfDay(new Date(entry.completedAt), locale)}
                              </span>
                            )}
                            {entry.mood && (
                              <span className="shrink-0 text-[11px]">{MOOD_EMOJI[entry.mood - 1]}</span>
                            )}
                            {entry.note && (
                              <span className="min-w-0 truncate font-serif-italic text-xs text-muted">
                                {entry.note}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {!exhausted && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="mt-4 w-full rounded-lg border border-border py-2 text-xs text-muted disabled:opacity-60"
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
