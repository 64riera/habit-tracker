"use client";

import { useMemo } from "react";
import { Coffee } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";
import { addDays, groupByDate, parseISODate } from "@/lib/date";
import { formatClock } from "@/lib/focus/format";
import type { FocusSessionRow } from "@/lib/queries/focus";

export function FocusHistorialClient({
  sessions,
  habitNames,
  today,
}: {
  sessions: FocusSessionRow[];
  habitNames: { id: string; name: string }[];
  today: string;
}) {
  const { t, locale } = useI18n();
  const groups = useMemo(() => groupByDate(sessions), [sessions]);
  const habitNameById = useMemo(() => new Map(habitNames.map((h) => [h.id, h.name])), [habitNames]);
  const yesterday = addDays(today, -1);

  const dayHeaderFormatter = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeFormatter = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  function formatDayHeader(date: string) {
    if (date === today) return t("checkin.today");
    if (date === yesterday) return t("history.yesterday");
    return dayHeaderFormatter.format(parseISODate(date));
  }

  return (
    <div>
      <ContentHeader
        titleKey="focus.history.title"
        subtitleKey="screens.enfoque.subtitle"
        backHref="/enfoque"
      />

      {groups.length === 0 ? (
        <p className="text-sm text-muted">{t("focus.history.empty")}</p>
      ) : (
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
                        {timeFormatter.format(new Date(session.startedAt))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
