"use client";

import { useEffect, useState } from "react";
import { useHasMounted } from "./use-has-mounted";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Chrome/Edge/Android fire `beforeinstallprompt` when the PWA meets the
 * installability criteria (manifest + service worker + engagement) — it
 * has to be captured and stored so it can be relaunched later, from a user
 * click in Settings instead of the browser's native banner. Safari/iOS
 * never fires that event: there, only manual instructions can be shown
 * ("Share" → "Add to Home Screen").
 *
 * The server can't know either of these two facts (they depend on the
 * actual browser) — they're only read after mounting (`useHasMounted`,
 * same pattern as ThemeToggle/PushToggle) so as not to mismatch the
 * server-rendered HTML against what the client builds on hydration.
 */
export function useInstallPrompt() {
  const mounted = useHasMounted();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (!mounted) {
    return { canInstall: false, isIOSManual: false, promptInstall };
  }
  const isStandalone = detectStandalone();
  return {
    canInstall: deferredPrompt !== null && !isStandalone,
    isIOSManual: detectIOS() && !isStandalone,
    promptInstall,
  };
}
