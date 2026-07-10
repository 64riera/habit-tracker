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
 * Chrome/Edge/Android disparan `beforeinstallprompt` cuando la PWA cumple los
 * criterios de instalabilidad (manifest + service worker + engagement) — hay
 * que capturarlo y guardarlo para poder relanzarlo después, desde un click
 * del usuario en Ajustes en vez del banner nativo del navegador. Safari/iOS
 * nunca dispara ese evento: ahí solo se puede mostrar instrucciones
 * manuales ("Compartir" → "Agregar a inicio").
 *
 * El servidor no puede saber ninguno de estos dos datos (dependen del
 * navegador real) — se leen recién después de montar (`useHasMounted`,
 * mismo patrón que ThemeToggle/PushToggle) para no desalinear el HTML del
 * servidor del que arma el cliente al hidratar.
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
