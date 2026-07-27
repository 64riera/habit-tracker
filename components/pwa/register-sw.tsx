"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort registration: if it fails, the app keeps working without offline support.
    });

    // A new SW takes control (skipWaiting + clients.claim, see
    // lib/sw/sw-source.ts) right after every deploy — without reloading, a
    // tab left open across that deploy keeps running the old JS bundle
    // against Server Actions from the new one, which fail once their IDs
    // no longer match. Only reacts to a *takeover* (there was already a
    // controller); skips the very first claim on a brand-new visit, which
    // has nothing stale to fix. `refreshed` guards against a reload loop
    // if more than one controllerchange fires before navigation happens.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshed = false;
    function onControllerChange() {
      if (!hadController || refreshed) return;
      refreshed = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
