"use client";

import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { deleteRoutine } from "@/lib/actions/routines";
import { useOfflineIdAction } from "@/lib/offline/form";

export function DeleteRoutineButton({ routineId }: { routineId: string }) {
  const { t } = useI18n();
  const action = useOfflineIdAction({
    onlineAction: () => deleteRoutine(routineId),
    buildMutation: () => ({ type: "deleteRoutine", routineId }),
  });
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(t("routines.confirmDelete"))) e.preventDefault();
      }}
    >
      <button type="submit" className="flex items-center gap-1.5 text-[12.5px] text-muted">
        <Trash2 size={13} strokeWidth={2} aria-hidden />
        {t("common.delete")}
      </button>
    </form>
  );
}
