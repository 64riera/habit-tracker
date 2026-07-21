"use client";

import { useRef } from "react";
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

/** Generic confirmation modal with the rest of the app's styling (same
 * pattern as InstallSuggestionModal: animated overlay + panel, radix-dialog). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: Props) {
  // Radix's own default is to auto-focus the first focusable element inside
  // the panel — here that would be Confirm, which for a destructive action
  // (delete/archive) means a reflex Enter press right after the dialog
  // opens could confirm it unintentionally. Focusing Cancel instead keeps
  // that safe (Enter on it just closes) while still landing keyboard focus
  // *inside* the dialog — plain `preventDefault()` with no explicit target
  // left focus stranded on whatever was focused before the dialog opened,
  // now hidden behind the overlay.
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-modal-overlay-in fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          className="animate-modal-panel-in fixed top-1/2 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-[0_24px_48px_-20px_var(--header-shadow)] outline-none"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            cancelRef.current?.focus();
          }}
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
              <button ref={cancelRef} type="button" className="text-[12.5px] font-medium text-muted">
                {cancelLabel}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
