"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { Dumbbell, ListChecks, Plus, Trash2, TrendingUp } from "lucide-react";
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
import { fetchGymSessionsAction, fetchGymSessionDraftAction } from "@/lib/actions/gym-read";
import { fetchGymExercisesAction } from "@/lib/actions/gym-exercises-read";
import { useConfirmAction } from "@/lib/hooks/use-confirm-action";
import type { GymSessionRow as GymSession } from "@/lib/queries/gym";
import type { GymExerciseCatalogRow } from "@/lib/queries/gym-exercises";

export function GymClient({
  sessions: initialSessions,
  exercises: initialExercises,
  today,
  draft: initialDraft,
}: {
  sessions: GymSession[];
  exercises: GymExerciseCatalogRow[];
  today: string;
  draft?: GymSession;
}) {
  const { t, locale } = useI18n();
  const { mutate } = useSWRConfig();
  const { data: sessions } = usePageData(swrKeys.gymSessions(), fetchGymSessionsAction, initialSessions);
  const { data: exercises } = usePageData(swrKeys.gymExercises(), fetchGymExercisesAction, initialExercises);
  const { data: draft } = usePageData(swrKeys.gymSessionDraft(), fetchGymSessionDraftAction, initialDraft);
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const { pendingMutations, runOrQueue } = useOffline();
  const [, startTransition] = useTransition();
  const { requestConfirm, dialog } = useConfirmAction();

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
    requestConfirm({
      title: t("common.confirm"),
      description: t("gym.confirmDelete"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        startTransition(async () => {
          await runOrQueue({ type: "deleteGymSession", sessionId });
          mutate(swrKeys.gymSessions());
        });
      },
    });
  }

  const draftTotalSets = draft?.exercises.reduce((sum, e) => sum + e.sets.length, 0) ?? 0;

  return (
    <div>
      <ContentHeader titleKey="screens.gym.title" subtitleKey="screens.gym.subtitle" />

      {draft && (
        // Links to /gym/new, not /gym/${draft.id}: a draft's `status` is
        // "draft", not "completed", so the per-id edit route (which only
        // looks up completed sessions, see getGymSessions) would 404 on it.
        // /gym/new already restores whatever draft exists as soon as it
        // mounts (see GymSessionForm's `initialDraft`), so no extra
        // "resume" logic is needed here beyond linking there.
        <Link
          href="/gym/new"
          className="mb-3 flex items-center gap-3 rounded-xl border border-border py-2.5 px-3"
          style={{ background: "color-mix(in oklch, var(--color-cat-fitness) 8%, transparent)" }}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: "color-mix(in oklch, var(--color-cat-fitness) 16%, transparent)", color: "var(--color-cat-fitness)" }}
            aria-hidden
          >
            <Dumbbell size={16} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold">{t("gym.draftInProgressTitle")}</span>
            <span className="mt-0.5 block truncate text-[11px] text-muted">
              {t("gym.summary", { exercises: draft.exercises.length, sets: draftTotalSets })}
            </span>
          </span>
          <span className="shrink-0 text-[11.5px] font-semibold" style={{ color: "var(--color-cat-fitness)" }}>
            {t("gym.continueDraft")}
          </span>
        </Link>
      )}

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

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <Link
          href="/gym/new"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-text py-2.5 text-center text-xs font-semibold text-surface"
        >
          <Plus size={14} strokeWidth={2} aria-hidden />
          {t("gym.newSession")}
        </Link>
        <Link
          href="/gym/stats"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted"
        >
          <TrendingUp size={14} strokeWidth={2} aria-hidden />
          {t("gym.stats.viewLink")}
        </Link>
        <Link
          href="/gym/exercises"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted"
        >
          <Dumbbell size={14} strokeWidth={2} aria-hidden />
          {t("gym.exercisesManage")}
        </Link>
        <Link
          href="/gym/routines"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted"
        >
          <ListChecks size={14} strokeWidth={2} aria-hidden />
          {t("gym.routinesManage")}
        </Link>
      </div>
      {dialog}
    </div>
  );
}
