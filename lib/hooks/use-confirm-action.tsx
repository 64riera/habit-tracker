"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
};

/** Shared confirm-before-destructive-action flow, backed by the app's own `ConfirmDialog`
 * instead of the browser's native `confirm()` — call `requestConfirm(...)` from a delete/cancel
 * handler, and render `{dialog}` once anywhere in the component's JSX. */
export function useConfirmAction() {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);

  function requestConfirm(options: ConfirmOptions) {
    setPending(options);
  }

  const dialog = pending ? (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      title={pending.title}
      description={pending.description}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      onConfirm={pending.onConfirm}
    />
  ) : null;

  return { requestConfirm, dialog };
}
