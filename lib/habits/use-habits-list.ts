"use client";

import { useMemo, useState, useTransition } from "react";
import { useSWRConfig } from "swr";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import {
  pendingHabitCreates,
  pendingHabitUpdates,
  pendingHabitArchiveIds,
  pendingHabitRestoreIds,
  buildGhostHabit,
  applyPendingHabitEdit,
} from "@/lib/offline/pending-selectors";
import { swrKeys } from "@/lib/swr/keys";
import { usePageData } from "@/lib/swr/use-page-data";
import { fetchCategoriesAction, fetchFocusHeaderAction, fetchHabitsListAction } from "@/lib/actions/habits-read";
import { useConfirmAction } from "@/lib/hooks/use-confirm-action";
import type { CategoryRow, HabitWithExtras } from "@/lib/queries/habits";
import type { FocusHeaderData } from "@/lib/queries/focus";

/** Fetches the habits list plus its offline overlay (ghosts + pending edits/
 * archive/restore), splits it into visible/archived, and exposes the
 * pin/archive/restore/reorder mutation handlers — each optimistic-then-synced,
 * same shape as the rest of the app's offline actions. Also owns the
 * confirm-before-archive dialog (via useConfirmAction, same pattern it already
 * establishes), so HabitosClient only renders `confirmDialog` and stays
 * presentation-only (the SwipeableRow/ReorderableList markup). */
export function useHabitsListData(
  today: string,
  initial: { habits: HabitWithExtras[]; categories: CategoryRow[]; focusHeader: FocusHeaderData }
) {
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const { data: habits } = usePageData(swrKeys.habitsList(today), () => fetchHabitsListAction(today), initial.habits);
  const { data: categories } = usePageData(swrKeys.categories(), fetchCategoriesAction, initial.categories);
  const { data: focusHeader } = usePageData(swrKeys.focusHeader(), fetchFocusHeaderAction, initial.focusHeader);
  const { pendingMutations, runOrQueue } = useOffline();
  const [, startTransition] = useTransition();
  const { requestConfirm, dialog: confirmDialog } = useConfirmAction();
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
      mutate(swrKeys.habitsList(today));
    });
  }

  function handleTogglePin(habitId: string, pinned: boolean) {
    setPinnedOverrides((prev) => ({ ...prev, [habitId]: pinned }));
    startTransition(async () => {
      await runOrQueue({ type: "togglePinHabit", habitId, pinned });
      mutate(swrKeys.habitsList(today));
    });
  }

  function handleRestore(habitId: string) {
    setRestoredIds((prev) => new Set(prev).add(habitId));
    startTransition(async () => {
      await runOrQueue({ type: "restoreHabit", habitId });
      mutate(swrKeys.habitsList(today));
    });
  }

  function requestArchive(habitId: string) {
    requestConfirm({
      title: t("common.confirm"),
      description: t("habit.deleteConfirm"),
      confirmLabel: t("common.archive"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        setArchivedOverrides((prev) => ({ ...prev, [habitId]: true }));
        startTransition(async () => {
          await runOrQueue({ type: "archiveHabit", habitId });
          mutate(swrKeys.habitsList(today));
        });
      },
    });
  }

  return {
    focusHeader,
    pinnedOverrides,
    pendingIds,
    visibleHabits,
    archivedHabits,
    handleReorder,
    handleTogglePin,
    handleRestore,
    requestArchive,
    confirmDialog,
  };
}
