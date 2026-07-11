"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Tags, Repeat, Trophy, RotateCcw, Archive, Star } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { FocusHeaderChip } from "@/components/focus/focus-header-chip";
import { ReorderableList } from "@/components/ui/reorderable-list";
import { SwipeableRow, SwipeableListProvider } from "@/components/ui/swipeable-row";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName, describeFrequency, habitAvatarGlyph } from "@/lib/habits/describe";
import { useOffline } from "@/lib/offline/client";
import { PendingSyncBadge } from "@/components/offline/pending-sync-badge";
import {
  pendingHabitCreates,
  pendingHabitUpdates,
  pendingHabitArchiveIds,
  pendingHabitRestoreIds,
  buildGhostHabit,
  applyPendingHabitEdit,
} from "@/lib/offline/pending-selectors";
import type { CategoryRow, HabitWithExtras } from "@/lib/queries/habits";
import type { FocusHeaderData } from "@/lib/queries/focus";

export function HabitosClient({
  habits,
  categories,
  focusHeader,
}: {
  habits: HabitWithExtras[];
  categories: CategoryRow[];
  focusHeader: FocusHeaderData;
}) {
  const { t, dict, locale } = useI18n();
  const router = useRouter();
  const { pendingMutations, runOrQueue } = useOffline();
  const [, startTransition] = useTransition();
  const [pinnedOverrides, setPinnedOverrides] = useState<Record<string, boolean>>({});
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());
  const [archivedOverrides, setArchivedOverrides] = useState<Record<string, boolean>>({});

  const pendingNewHabits = pendingHabitCreates(pendingMutations);
  const pendingEdits = pendingHabitUpdates(pendingMutations);
  const pendingArchiveIds = pendingHabitArchiveIds(pendingMutations);
  const pendingRestoreIds = pendingHabitRestoreIds(pendingMutations);
  const pendingIds = useMemo(
    () => new Set([...pendingNewHabits.map((m) => m.id), ...pendingEdits.keys()]),
    [pendingNewHabits, pendingEdits]
  );

  const displayHabits = useMemo(() => {
    const overlaid = habits.map((h) =>
      pendingEdits.has(h.id) ? applyPendingHabitEdit(h, pendingEdits.get(h.id)!, categories) : h
    );
    const ghosts = pendingNewHabits.map((m) => buildGhostHabit(m.id, m.values, categories));
    return [...overlaid, ...ghosts];
  }, [habits, pendingEdits, pendingNewHabits, categories]);

  const visibleHabits = displayHabits.filter(
    (h) => h.status !== "archived" && !pendingArchiveIds.has(h.id) && !archivedOverrides[h.id]
  );
  const archivedHabits = displayHabits.filter(
    (h) =>
      (h.status === "archived" || pendingArchiveIds.has(h.id) || archivedOverrides[h.id]) &&
      !restoredIds.has(h.id) &&
      !pendingRestoreIds.has(h.id)
  );

  function handleReorder(orderedIds: string[]) {
    startTransition(async () => {
      await runOrQueue({ type: "reorderHabits", orderedIds });
      router.refresh();
    });
  }

  function handleTogglePin(habitId: string, pinned: boolean) {
    setPinnedOverrides((prev) => ({ ...prev, [habitId]: pinned }));
    startTransition(async () => {
      await runOrQueue({ type: "togglePinHabit", habitId, pinned });
      router.refresh();
    });
  }

  function handleRestore(habitId: string) {
    setRestoredIds((prev) => new Set(prev).add(habitId));
    startTransition(async () => {
      await runOrQueue({ type: "restoreHabit", habitId });
      router.refresh();
    });
  }

  function handleArchive(habitId: string) {
    if (!confirm(t("habit.deleteConfirm"))) return;
    setArchivedOverrides((prev) => ({ ...prev, [habitId]: true }));
    startTransition(async () => {
      await runOrQueue({ type: "archiveHabit", habitId });
      router.refresh();
    });
  }

  return (
    <div>
      <ContentHeader
        titleKey="screens.habitos.title"
        subtitleKey="screens.habitos.subtitle"
        headerAccessory={<FocusHeaderChip session={focusHeader.session} soundEnabled={focusHeader.soundEnabled} />}
      />

      {visibleHabits.length === 0 ? (
        <p className="text-sm text-muted">{t("habit.empty")}</p>
      ) : (
        <SwipeableListProvider>
          <ReorderableList
            items={visibleHabits}
            onReorder={handleReorder}
            renderItem={(habit, dragHandleProps) => {
              const color = habit.category?.color ?? "var(--color-text)";
              const isPinned = pinnedOverrides[habit.id] ?? habit.isPinned;
              const isPending = pendingIds.has(habit.id);
              return (
                <SwipeableRow
                  id={habit.id}
                  leadingActions={[
                    {
                      key: "pin",
                      label: isPinned ? t("habit.unpin") : t("habit.pin"),
                      icon: <Star size={16} strokeWidth={2} fill={isPinned ? "currentColor" : "none"} aria-hidden />,
                      background: "var(--color-accent)",
                      color: "var(--color-accent-contrast)",
                      onAction: () => handleTogglePin(habit.id, !isPinned),
                    },
                  ]}
                  trailingActions={[
                    {
                      key: "archive",
                      label: t("common.archive"),
                      icon: <Archive size={16} strokeWidth={2} aria-hidden />,
                      background: "var(--color-cat-fitness)",
                      onAction: () => handleArchive(habit.id),
                    },
                  ]}
                >
                  <div
                    className="flex items-center gap-2.5 border-b border-border py-3"
                    style={isPending ? { opacity: 0.6 } : undefined}
                  >
                    <button
                      type="button"
                      onPointerDown={dragHandleProps.onPointerDown}
                      onKeyDown={dragHandleProps.onKeyDown}
                      className="shrink-0 cursor-grab select-none px-0.5 text-muted"
                      style={{ touchAction: "none" }}
                      aria-label={t("habit.reorder")}
                    >
                      ⠿
                    </button>
                    <Link
                      href={`/habits/${habit.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif-italic text-[13px] font-semibold"
                        style={{ background: `color-mix(in oklch, ${color} 16%, transparent)`, color }}
                      >
                        {habitAvatarGlyph(habit)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
                          {isPinned && (
                            <Star
                              size={12}
                              strokeWidth={2}
                              fill="currentColor"
                              aria-hidden
                              style={{ color: "var(--color-accent)" }}
                            />
                          )}
                          <span className="truncate">{habit.name}</span>
                          {isPending && <PendingSyncBadge />}
                        </div>
                        <div className="mt-0.5 truncate text-[10.5px] text-muted">
                          {categoryDisplayName(habit.category, locale)} · {describeFrequency(habit, dict)}
                        </div>
                      </div>
                    </Link>
                    <div
                      className="shrink-0 text-[9.5px] font-semibold"
                      style={{
                        color:
                          habit.status === "active" ? "var(--color-text)" : "var(--color-muted)",
                      }}
                    >
                      {t(`habit.status.${habit.status}`)}
                    </div>
                  </div>
                </SwipeableRow>
              );
            }}
          />
        </SwipeableListProvider>
      )}

      {archivedHabits.length > 0 && (
        <div className="mt-5">
          <div className="mb-1 text-[10px] tracking-wide text-muted uppercase">
            {t("habit.archivedSection")}
          </div>
          <SwipeableListProvider>
            <div className="flex flex-col">
              {archivedHabits.map((habit) => (
                <SwipeableRow
                  key={habit.id}
                  id={habit.id}
                  trailingActions={[
                    {
                      key: "restore",
                      label: t("habit.restore"),
                      icon: <RotateCcw size={16} strokeWidth={2} aria-hidden />,
                      background: "var(--color-accent)",
                      color: "var(--color-accent-contrast)",
                      onAction: () => handleRestore(habit.id),
                    },
                  ]}
                >
                  <Link
                    href={`/habits/${habit.id}`}
                    className="flex items-center gap-2.5 border-b border-border py-3 opacity-60"
                  >
                    <div className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                      {habit.name}
                    </div>
                  </Link>
                </SwipeableRow>
              ))}
            </div>
          </SwipeableListProvider>
        </div>
      )}

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <Link
          href="/habits/new"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-text py-2.5 text-center text-xs font-semibold text-surface"
        >
          <Plus size={14} strokeWidth={2} aria-hidden />
          {t("habit.newHabitShort")}
        </Link>
        <Link
          href="/habits/categories"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted"
        >
          <Tags size={14} strokeWidth={2} aria-hidden />
          {t("categories.manage")}
        </Link>
        <Link
          href="/habits/routines"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted"
        >
          <Repeat size={14} strokeWidth={2} aria-hidden />
          {t("routines.title")}
        </Link>
        <Link
          href="/habits/achievements"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted"
        >
          <Trophy size={14} strokeWidth={2} aria-hidden />
          {t("achievements.title")}
        </Link>
      </div>
    </div>
  );
}
