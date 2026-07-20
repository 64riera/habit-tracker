"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { deleteTask } from "@/lib/actions/tasks";
import { useOfflineIdAction } from "@/lib/offline/form";
import { useConfirmAction } from "@/lib/hooks/use-confirm-action";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const { t } = useI18n();
  const action = useOfflineIdAction({
    onlineAction: () => deleteTask(taskId),
    buildMutation: () => ({ type: "deleteTask", taskId }),
  });
  const formRef = useRef<HTMLFormElement>(null);
  const { requestConfirm, dialog } = useConfirmAction();

  return (
    <form ref={formRef} action={action}>
      <button
        type="button"
        onClick={() =>
          requestConfirm({
            title: t("common.confirm"),
            description: t("tasks.confirmDelete"),
            confirmLabel: t("common.delete"),
            cancelLabel: t("common.cancel"),
            onConfirm: () => formRef.current?.requestSubmit(),
          })
        }
        className="flex items-center gap-1.5 text-[12.5px] text-muted"
      >
        <Trash2 size={13} strokeWidth={2} aria-hidden />
        {t("common.delete")}
      </button>
      {dialog}
    </form>
  );
}
