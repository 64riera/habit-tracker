"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { logHabit, deleteLog } from "@/lib/actions/logs";
import { enqueueMutation, getQueuedMutations, removeQueuedMutation } from "@/lib/offline/db";
import type { QueuedMutation } from "@/lib/offline/db";
import { useAchievementToast } from "@/lib/toast/client";

type SyncState = "offline" | "syncing" | "synced" | "idle";

type OfflineContextValue = {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  /** Intenta ejecutar la mutación; si falla o no hay conexión, la encola para reintentar al reconectar. */
  runOrQueue: (mutation: QueuedMutation) => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

const SYNCED_BANNER_MS = 2500;

function subscribeToConnectivity(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getConnectivitySnapshot() {
  return navigator.onLine;
}

function getServerConnectivitySnapshot() {
  return true;
}

async function replay(mutation: QueuedMutation) {
  if (mutation.type === "log") return logHabit(mutation.input);
  return deleteLog(mutation.habitId, mutation.date);
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useSyncExternalStore(
    subscribeToConnectivity,
    getConnectivitySnapshot,
    getServerConnectivitySnapshot
  );
  const [isDraining, setIsDraining] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const router = useRouter();
  const notifyAchievements = useAchievementToast();
  const draining = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const queued = await getQueuedMutations();
    setPendingCount(queued.length);
    return queued;
  }, []);

  const drainQueue = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;
    setIsDraining(true);
    try {
      const queued = await refreshPendingCount();
      for (const mutation of queued) {
        const result = await replay(mutation);
        if (result && "unlocked" in result) notifyAchievements(result.unlocked);
        await removeQueuedMutation(mutation.id);
      }
      if (queued.length > 0) {
        await refreshPendingCount();
        router.refresh();
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), SYNCED_BANNER_MS);
      }
    } catch {
      // Seguimos sin conexión de verdad: se reintentará en el próximo evento "online".
    } finally {
      draining.current = false;
      setIsDraining(false);
    }
  }, [notifyAchievements, refreshPendingCount, router]);

  useEffect(() => {
    // Lee el estado de la cola (IndexedDB) al montar; no es estado derivable en render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshPendingCount();
  }, [refreshPendingCount]);

  // `drainQueue` se recrea cuando cambian sus dependencias (p. ej. `t` tras un
  // router.refresh()); guardarlo en un ref evita que ese cambio de identidad
  // por sí solo dispare el efecto de abajo, lo que causaba un ciclo:
  // refresh -> nuevo `t` -> nuevo drainQueue -> efecto -> refresh -> ...
  const drainQueueRef = useRef(drainQueue);
  useEffect(() => {
    drainQueueRef.current = drainQueue;
  });

  useEffect(() => {
    // Reintenta la cola cuando el navegador recupera conexión (evento externo real).
    if (isOnline) drainQueueRef.current();
  }, [isOnline]);

  const runOrQueue = useCallback(
    async (mutation: QueuedMutation) => {
      if (!navigator.onLine) {
        await enqueueMutation(mutation);
        await refreshPendingCount();
        return;
      }
      try {
        const result = await replay(mutation);
        if (result && "unlocked" in result) notifyAchievements(result.unlocked);
      } catch {
        await enqueueMutation(mutation);
        await refreshPendingCount();
      }
    },
    [notifyAchievements, refreshPendingCount]
  );

  const syncState: SyncState = !isOnline ? "offline" : isDraining ? "syncing" : justSynced ? "synced" : "idle";

  return (
    <OfflineContext.Provider value={{ isOnline, syncState, pendingCount, runOrQueue }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline debe usarse dentro de <OfflineProvider>");
  return ctx;
}
