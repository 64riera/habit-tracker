"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useI18n } from "@/lib/i18n/client";
import { useInstallPrompt } from "@/lib/hooks/use-install-prompt";
import { setInstallPromptSeen } from "@/lib/actions/preferences";
import { APP_NAME } from "@/lib/branding";

/**
 * Sugerencia de instalar la PWA, una sola vez, justo después de crear el
 * primer hábito — `shouldOffer` viene calculado en el servidor
 * (`habitCount === 1 && !installPromptSeen`, ver app/(dashboard)/layout.tsx).
 * Solo cuenta como "mostrado" (y se guarda en la cuenta) si el navegador
 * realmente tiene algo para ofrecer: si `beforeinstallprompt` todavía no
 * disparó y tampoco es iOS, no se le "gasta" la única oportunidad — queda
 * abierta para una visita futura en la que sí se pueda ofrecer.
 */
export function InstallSuggestionModal({ shouldOffer }: { shouldOffer: boolean }) {
  const { t } = useI18n();
  const { canInstall, isIOSManual, promptInstall } = useInstallPrompt();
  // `shouldOffer` es una prop server-computed: no cambia sola cuando se
  // decide algo en el modal (Server Components no se re-renderizan solos).
  // El dismiss local es lo que efectivamente cierra el diálogo en esta
  // sesión; `setInstallPromptSeen()` persiste la decisión para que no
  // vuelva a ofrecerse en una visita futura.
  const [dismissed, setDismissed] = useState(false);

  const open = !dismissed && shouldOffer && (canInstall || isIOSManual);

  function markSeen() {
    setDismissed(true);
    setInstallPromptSeen();
  }

  function handleInstall() {
    promptInstall();
    markSeen();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && markSeen()}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-modal-overlay-in fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          className="animate-modal-panel-in fixed top-1/2 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-[0_24px_48px_-20px_var(--header-shadow)] outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="font-serif-italic text-xl font-semibold">
            {t("pwa.installTitle", { name: APP_NAME })}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[13.5px] leading-relaxed text-muted">
            {isIOSManual ? t("pwa.installIos") : t("pwa.installBody")}
          </Dialog.Description>

          {canInstall ? (
            <div className="mt-5 flex items-center gap-4">
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={handleInstall}
                  className="rounded-full px-4 py-2 text-[12.5px] font-medium"
                  style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
                >
                  {t("pwa.install")}
                </button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <button type="button" className="text-[12.5px] font-medium text-muted">
                  {t("pwa.installDecline")}
                </button>
              </Dialog.Close>
            </div>
          ) : (
            <div className="mt-5">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-[12.5px] font-medium"
                  style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
                >
                  {t("pwa.installIosDismiss")}
                </button>
              </Dialog.Close>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
