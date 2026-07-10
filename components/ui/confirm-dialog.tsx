"use client";

import * as Dialog from "@radix-ui/react-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
};

/** Modal de confirmación genérico con los estilos del resto de la app (mismo
 * patrón que InstallSuggestionModal: overlay + panel animados, radix-dialog). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-modal-overlay-in fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          className="animate-modal-panel-in fixed top-1/2 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-[0_24px_48px_-20px_var(--header-shadow)] outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="font-serif-italic text-xl font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-[13.5px] leading-relaxed text-muted">
            {description}
          </Dialog.Description>
          <div className="mt-5 flex items-center gap-4">
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-full px-4 py-2 text-[12.5px] font-medium"
                style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
              >
                {confirmLabel}
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button type="button" className="text-[12.5px] font-medium text-muted">
                {cancelLabel}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
