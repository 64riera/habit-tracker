"use client";

import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { deleteGymSession } from "@/lib/actions/gym";
import { useOfflineIdAction } from "@/lib/offline/form";

export function DeleteGymSessionButton({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const action = useOfflineIdAction({
    onlineAction: () => deleteGymSession(sessionId),
    buildMutation: () => ({ type: "deleteGymSession", sessionId }),
  });
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(t("gym.confirmDelete"))) e.preventDefault();
      }}
    >
      <button type="submit" className="flex items-center gap-1.5 text-[12.5px] text-muted">
        <Trash2 size={13} strokeWidth={2} aria-hidden />
        {t("common.delete")}
      </button>
    </form>
  );
}
