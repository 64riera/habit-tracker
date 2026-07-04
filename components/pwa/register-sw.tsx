"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registro best-effort: si falla, la app sigue funcionando sin soporte offline.
    });
  }, []);

  return null;
}
