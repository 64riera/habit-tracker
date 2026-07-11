"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { SegmentedRouteTabs } from "@/components/nav/segmented-route-tabs";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { addDays, formatTimeOfDay, groupByDate, parseISODate } from "@/lib/date";
import { formatClock, formatMinutesShort } from "@/lib/focus/format";
import type { FocusSessionRow } from "@/lib/queries/focus";
import type { FocusHistorySummary } from "@/lib/queries/focus-stats";

const PAGE_SIZE = 20;

const FOCUS_TABS = [
  { key: "historial", href: "/enfoque/historial", dictKey: "nav.historial" },
  { key: "estadisticas", href: "/enfoque/estadisticas", dictKey: "nav.estadisticas" },
] as const;

export function FocusHistorialClient({
  sessions,
  summary,
  habitNames,
  today,
  selectedHabit,
}: {
  sessions: FocusSessionRow[];
  summary: FocusHistorySummary;
  habitNames: { id: string; name: string }[];
  today: string;
  selectedHabit: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [entries, setEntries] = useState(sessions);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(sessions.length < PAGE_SIZE);
  // El filtro por hábito navega a una nueva URL, pero React puede conservar
  // esta misma instancia del componente (mismo bug de fondo que el
  // I18nProvider: `useState` solo mira su valor inicial en el primer mount,
  // no en cada cambio de props) — se reconcilia comparando contra el
  // filtro anterior y resembrando el estado durante el render.
  const [prevHabitFilter, setPrevHabitFilter] = useState(selectedHabit);
  if (selectedHabit !== prevHabitFilter) {
    setPrevHabitFilter(selectedHabit);
    setEntries(sessions);
    setExhausted(sessions.length < PAGE_SIZE);
  }

  const groups = useMemo(() => groupByDate(entries), [entries]);
  const habitNameById = useMemo(() => new Map(habitNames.map((h) => [h.id, h.name])), [habitNames]);
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

  function onHabitChange(habitId: string) {
    const params = new URLSearchParams();
    if (habitId) params.set("habit", habitId);
    const qs = params.toString();
    router.push(qs ? `/enfoque/historial?${qs}` : "/enfoque/historial");
  }

  async function loadMore() {
    setLoadingMore(true);
    const params = new URLSearchParams({ offset: String(entries.length) });
    if (selectedHabit) params.set("habit", selectedHabit);
    const res = await fetch(`/api/focus-history?${params.toString()}`);
    const data = await res.json();
    setEntries((prev) => [...prev, ...data.sessions]);
    if (data.sessions.length < PAGE_SIZE) setExhausted(true);
    setLoadingMore(false);
  }

  const summaryCards = [
    { value: formatMinutesShort(summary.totalMinutes), label: t("focus.stats.totalTime") },
    { value: String(summary.sessionCount), label: t("focus.stats.sessions") },
    { value: `${summary.completionRatePct}%`, label: t("focus.stats.completionRate") },
  ];

  return (
    <div>
      <ContentHeader titleKey="focus.history.title" subtitleKey="screens.enfoque.subtitle" backHref="/enfoque" />
      <SegmentedRouteTabs tabs={FOCUS_TABS} />

      <div className="mb-5">
        <Select
          variant="pill"
          value={selectedHabit}
          onValueChange={onHabitChange}
          ariaLabel={t("history.filterHabit")}
          placeholder={t("history.filterHabit")}
          options={[
            { value: "", label: t("history.filterHabit") },
            ...habitNames.map((h) => ({ value: h.id, label: h.name })),
          ]}
        />
      </div>

      <div className="mb-8 flex">
        {summaryCards.map((c, i) => (
          <div key={i} className="flex-1 border-l border-border px-4 first:border-l-0 first:pl-0 md:px-[22px]">
            <div className="font-serif-italic text-2xl font-semibold md:text-[30px]">{c.value}</div>
            <div className="mt-1 text-[11.5px] text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted">{t("focus.history.empty")}</p>
      ) : (
        <>
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.date}>
                <div className="mb-1.5 font-serif-italic text-[15px] leading-tight">{formatDayHeader(group.date)}</div>
                <div className="flex flex-col">
                  {group.items.map((session) => {
                    const habitName = session.habitId ? habitNameById.get(session.habitId) : undefined;
                    const isCancelled = session.status === "cancelled";
                    return (
                      <div
                        key={session.id}
                        className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-border py-2"
                      >
                        <span
                          className={
                            isCancelled
                              ? "shrink-0 text-[12.5px] font-medium text-muted line-through"
                              : "shrink-0 text-[12.5px] font-medium tabular-nums"
                          }
                        >
                          {formatClock(session.accumulatedActiveSeconds)}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted">{t(`focus.mode.${session.mode}`)}</span>
                        {isCancelled && (
                          <span className="shrink-0 text-[11px] text-muted">{t("focus.status.cancelled")}</span>
                        )}
                        {habitName && <span className="min-w-0 truncate text-[11px] text-muted">· {habitName}</span>}
                        {session.breaksTakenCount > 0 && (
                          <span className="flex shrink-0 items-center gap-1 text-[10.5px] text-muted">
                            <Coffee size={11} strokeWidth={2} aria-hidden />
                            {session.breaksTakenCount}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-[10.5px] text-muted">
                          {formatTimeOfDay(new Date(session.startedAt), locale)}
                        </span>
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
  );
}
