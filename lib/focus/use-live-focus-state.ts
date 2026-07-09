"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { computeFocusState, type FocusSessionRow, type FocusStateView } from "@/lib/focus/compute";
import type { FocusRewardTier } from "@/lib/focus/rewards";

const TICK_MS = 1000;

type ResyncResult = { session: FocusSessionRow | null; unlockedTiers: FocusRewardTier[] };

/**
 * Ticking puramente cosmético: el `setInterval` de acá nunca escribe nada,
 * solo re-renderiza los dígitos en memoria a partir de la última fila que
 * mandó el servidor. Lo que hace que la sesión "siga corriendo" de verdad
 * es `resync` — se llama al montar, al recuperar foco/conexión, y cada vez
 * que el cálculo local detecta que ya debió ocurrir una transición (pausa
 * activa, tope alcanzado), para que el status mostrado nunca sea una
 * transición decidida solo por el cliente, sino siempre la que confirmó el
 * servidor. `onUnlocked` avisa si ese mismo resync fue el momento en que la
 * reconciliación completó la sesión y desbloqueó recompensas (p. ej. el
 * usuario mira la cuenta regresiva llegar a cero sin tocar "Terminar").
 */
export function useLiveFocusState(
  initialSession: FocusSessionRow | null,
  resync: () => Promise<ResyncResult>,
  onUnlocked?: (tiers: FocusRewardTier[]) => void
) {
  const [session, setSession] = useState(initialSession);
  const [now, setNow] = useState(() => new Date());
  const isResyncingRef = useRef(false);
  const onUnlockedRef = useRef(onUnlocked);
  useEffect(() => {
    onUnlockedRef.current = onUnlocked;
  }, [onUnlocked]);

  // Ajuste de estado durante el render (patrón documentado de React para
  // "resetear" estado derivado de una prop) en vez de un efecto separado:
  // si el server-render mandó una fila distinta (p. ej. tras un
  // router.refresh()), se adopta de inmediato, sin un frame extra de por
  // medio ni depender de otro effect para sincronizarla.
  const [prevInitialSession, setPrevInitialSession] = useState(initialSession);
  if (initialSession !== prevInitialSession) {
    setPrevInitialSession(initialSession);
    setSession(initialSession);
  }

  const runResync = useCallback(async () => {
    if (isResyncingRef.current) return;
    isResyncingRef.current = true;
    try {
      const { session: fresh, unlockedTiers } = await resync();
      setSession(fresh);
      setNow(new Date());
      if (unlockedTiers.length > 0) onUnlockedRef.current?.(unlockedTiers);
    } finally {
      isResyncingRef.current = false;
    }
  }, [resync]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    runResync();
    function onVisibilityChange() {
      if (document.visibilityState === "visible") runResync();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", runResync);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", runResync);
    };
  }, [runResync]);

  useEffect(() => {
    if (!session) return;
    const state = computeFocusState(session, now);
    if (state.dueForBreak || state.breakOver || state.overCap) runResync();
  }, [session, now, runResync]);

  const state: FocusStateView | null = session ? computeFocusState(session, now) : null;

  return { session, state, resync: runResync };
}
