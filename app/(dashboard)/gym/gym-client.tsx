"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { SwipeableRow, SwipeableListProvider } from "@/components/ui/swipeable-row";
import { GymSessionRow } from "@/components/gym/gym-session-row";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import {
  pendingGymSessionCreates,
  pendingGymSessionUpdates,
  pendingGymSessionDeleteIds,
  buildGhostGymSession,
  applyPendingGymSessionEdit,
} from "@/lib/offline/pending-selectors";
import { addDays, groupByDate, parseISODate } from "@/lib/date";
import { swrKeys } from "@/lib/swr/keys";
import { usePageData } from "@/lib/swr/use-page-data";
import { fetchGymSessionsAction } from "@/lib/actions/gym-read";
import { fetchGymExercisesAction } from "@/lib/actions/gym-exercises-read";
import type { GymSessionRow as GymSession } from "@/lib/queries/gym";
import type { GymExerciseCatalogRow } from "@/lib/queries/gym-exercises";

export function GymClient({
  sessions: initialSessions,
  exercises: initialExercises,
  today,
}: {
  sessions: GymSession[];
  exercises: GymExerciseCatalogRow[];
  today: string;
}) {
  const { t, locale } = useI18n();
  const { mutate } = useSWRConfig();
  const { data: sessions } = usePageData(swrKeys.gymSessions(), fetchGymSessionsAction, initialSessions);
  const { data: exercises } = usePageData(swrKeys.gymExercises(), fetchGymExercisesAction, initialExercises);
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const { pendingMutations, runOrQueue } = useOffline();
  const [, startTransition] = useTransition();

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

  const pendingNew = pendingGymSessionCreates(pendingMutations);
  const pendingEdits = pendingGymSessionUpdates(pendingMutations);
  const pendingDeleteIds = pendingGymSessionDeleteIds(pendingMutations);
  const pendingIds = useMemo(
    () => new Set([...pendingNew.map((m) => m.id), ...pendingEdits.keys()]),
    [pendingNew, pendingEdits]
  );

  const allSessions = useMemo(() => {
    const overlaid = sessions
      .filter((s) => !pendingDeleteIds.has(s.id))
      .map((s) => (pendingEdits.has(s.id) ? applyPendingGymSessionEdit(s, pendingEdits.get(s.id)!) : s));
    const ghosts = pendingNew.map((m) => buildGhostGymSession(m.id, m.values));
    return [...overlaid, ...ghosts].sort((a, b) => (a.date === b.date ? 0 : b.date.localeCompare(a.date)));
  }, [sessions, pendingEdits, pendingDeleteIds, pendingNew]);

  const groups = useMemo(() => groupByDate(allSessions), [allSessions]);

  function handleDelete(sessionId: string) {
    if (!confirm(t("gym.confirmDelete"))) return;
    startTransition(async () => {
      await runOrQueue({ type: "deleteGymSession", sessionId });
      mutate(swrKeys.gymSessions());
    });
  }

  return (
    <div>
      <ContentHeader titleKey="screens.gym.title" subtitleKey="screens.gym.subtitle" />

      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href="/gym/stats" className="flex items-center gap-1.5 text-[12px] text-muted">
          <TrendingUp size={13} strokeWidth={2} aria-hidden />
          {t("gym.stats.viewLink")}
        </Link>
        <Link
          href="/gym/new"
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] text-muted"
        >
          <Plus size={13} strokeWidth={2} aria-hidden />
          {t("gym.newSession")}
        </Link>
      </div>

      <SwipeableListProvider>
        <div className="flex flex-col gap-0.5">
          {groups.map((group) => (
            <div key={group.date}>
              <div className="pt-3 pb-1 font-serif-italic text-[15px] leading-tight">{formatDayHeader(group.date)}</div>
              {group.items.map((session) => (
                <SwipeableRow
                  key={session.id}
                  id={session.id}
                  trailingActions={[
                    {
                      key: "delete",
                      label: t("common.delete"),
                      icon: <Trash2 size={16} strokeWidth={2} aria-hidden />,
                      background: "var(--color-cat-fitness)",
                      onAction: () => handleDelete(session.id),
                    },
                  ]}
                >
                  <GymSessionRow
                    session={session}
                    exercisesById={exercisesById}
                    isPendingSync={pendingIds.has(session.id)}
                  />
                </SwipeableRow>
              ))}
            </div>
          ))}
          {groups.length === 0 && <p className="py-2 text-sm text-muted">{t("gym.empty")}</p>}
        </div>
      </SwipeableListProvider>
    </div>
  );
}
