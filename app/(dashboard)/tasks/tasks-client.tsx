"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { Plus, Trash2 } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { SwipeableRow, SwipeableListProvider } from "@/components/ui/swipeable-row";
import { TaskCheckRow } from "@/components/task/task-check-row";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import {
  pendingTaskCreates,
  pendingTaskUpdates,
  pendingTaskDeleteIds,
  buildGhostTask,
  applyPendingTaskEdit,
} from "@/lib/offline/pending-selectors";
import { swrKeys } from "@/lib/swr/keys";
import { usePageData } from "@/lib/swr/use-page-data";
import { fetchTasksAction } from "@/lib/actions/tasks-read";
import type { TaskWithStatus } from "@/lib/queries/tasks";

export function TasksClient({ tasks: initialTasks, today }: { tasks: TaskWithStatus[]; today: string }) {
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const { data: tasks } = usePageData(swrKeys.tasksList(today), () => fetchTasksAction(today), initialTasks);
  const { pendingMutations, runOrQueue } = useOffline();
  const [, startTransition] = useTransition();

  const pendingNew = pendingTaskCreates(pendingMutations);
  const pendingEdits = pendingTaskUpdates(pendingMutations);
  const pendingDeleteIds = pendingTaskDeleteIds(pendingMutations);
  const pendingIds = useMemo(
    () => new Set([...pendingNew.map((m) => m.id), ...pendingEdits.keys()]),
    [pendingNew, pendingEdits]
  );

  const displayTasks = useMemo(() => {
    const overlaid = tasks
      .filter((task) => !pendingDeleteIds.has(task.id))
      .map((task) => (pendingEdits.has(task.id) ? applyPendingTaskEdit(task, pendingEdits.get(task.id)!) : task));
    const ghosts = pendingNew.map((m) => buildGhostTask(m.id, m.values, today));
    return [...overlaid, ...ghosts];
  }, [tasks, pendingEdits, pendingDeleteIds, pendingNew, today]);

  function handleDelete(taskId: string) {
    if (!confirm(t("tasks.confirmDelete"))) return;
    startTransition(async () => {
      await runOrQueue({ type: "deleteTask", taskId });
      mutate(swrKeys.tasksList(today));
    });
  }

  return (
    <div>
      <ContentHeader titleKey="screens.tareas.title" subtitleKey="screens.tareas.subtitle" />
      <div className="mb-3 flex justify-end">
        <Link
          href="/tasks/new"
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] text-muted"
        >
          <Plus size={13} strokeWidth={2} aria-hidden />
          {t("tasks.newTask")}
        </Link>
      </div>
      <SwipeableListProvider>
        <div className="flex flex-col gap-0.5">
          {displayTasks.map((task) => (
            <SwipeableRow
              key={task.id}
              id={task.id}
              trailingActions={[
                {
                  key: "delete",
                  label: t("common.delete"),
                  icon: <Trash2 size={16} strokeWidth={2} aria-hidden />,
                  background: "var(--color-cat-fitness)",
                  onAction: () => handleDelete(task.id),
                },
              ]}
            >
              <TaskCheckRow task={task} today={today} isPendingSync={pendingIds.has(task.id)} />
            </SwipeableRow>
          ))}
          {displayTasks.length === 0 && <p className="py-2 text-sm text-muted">{t("tasks.empty")}</p>}
        </div>
      </SwipeableListProvider>
    </div>
  );
}
