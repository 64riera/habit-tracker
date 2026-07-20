"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { deleteTransaction } from "@/lib/actions/transactions";
import { useOfflineIdAction } from "@/lib/offline/form";
import { useConfirmAction } from "@/lib/hooks/use-confirm-action";

export function DeleteTransactionButton({ transactionId }: { transactionId: string }) {
  const { t } = useI18n();
  const action = useOfflineIdAction({
    onlineAction: () => deleteTransaction(transactionId),
    buildMutation: () => ({ type: "deleteTransaction", transactionId }),
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
            description: t("finance.confirmDelete"),
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
