"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useI18n } from "@/lib/i18n/client";
import { useInstallPrompt } from "@/lib/hooks/use-install-prompt";
import { setInstallPromptSeen } from "@/lib/actions/preferences";
import { APP_NAME } from "@/lib/branding";

/**
 * PWA install suggestion, shown once, right after creating the first habit —
 * `shouldOffer` is computed on the server
 * (`habitCount === 1 && !installPromptSeen`, see app/(dashboard)/layout.tsx).
 * It only counts as "shown" (and gets saved to the account) if the browser
 * actually has something to offer: if `beforeinstallprompt` hasn't fired yet
 * and it's not iOS either, the single opportunity isn't "spent" — it stays
 * open for a future visit where it can actually be offered.
 */
export function InstallSuggestionModal({ shouldOffer }: { shouldOffer: boolean }) {
  const { t } = useI18n();
  const { canInstall, isIOSManual, promptInstall } = useInstallPrompt();
  // `shouldOffer` is a server-computed prop: it doesn't change on its own
  // when something is decided in the modal (Server Components don't
  // re-render on their own). The local dismiss is what actually closes the
  // dialog in this session; `setInstallPromptSeen()` persists the decision
  // so it doesn't get offered again on a future visit.
  const [dismissed, setDismissed] = useState(false);
  // Unlike ConfirmDialog, nothing here is destructive (Install/Dismiss are
  // both harmless), so — unlike there — it's fine to land focus on the
  // primary CTA. Only one of the two branches below ever renders at once,
  // so sharing one ref between them is unambiguous.
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

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
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            primaryButtonRef.current?.focus();
          }}
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
                  ref={primaryButtonRef}
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
                  ref={primaryButtonRef}
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
