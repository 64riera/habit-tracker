"use client";

import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { deleteTask } from "@/lib/actions/tasks";
import { useOfflineIdAction } from "@/lib/offline/form";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const { t } = useI18n();
  const action = useOfflineIdAction({
    onlineAction: () => deleteTask(taskId),
    buildMutation: () => ({ type: "deleteTask", taskId }),
  });
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(t("tasks.confirmDelete"))) e.preventDefault();
      }}
    >
      <button type="submit" className="flex items-center gap-1.5 text-[12.5px] text-muted">
        <Trash2 size={13} strokeWidth={2} aria-hidden />
        {t("common.delete")}
      </button>
    </form>
  );
}
