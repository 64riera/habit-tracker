"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { enqueueMutation, getQueuedMutations, removeQueuedMutation } from "@/lib/offline/db";
import type { QueuedMutation, QueuedRecord } from "@/lib/offline/db";
import { replay } from "@/lib/offline/replay-registry";
import { useAchievementToast, useToast } from "@/lib/toast/client";
import { useI18n } from "@/lib/i18n/client";

type SyncState = "offline" | "syncing" | "synced" | "idle";

type OfflineContextValue = {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  pendingMutations: QueuedRecord[];
  /** Intenta ejecutar la mutación; si falla o no hay conexión, la encola para reintentar al reconectar. */
  runOrQueue: (mutation: QueuedMutation) => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

const SYNCED_BANNER_MS = 2500;
const BACKGROUND_SYNC_TAG = "sync-mutations";

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

/** Mejora progresiva: si el navegador soporta Background Sync, pide que nos despierte al reconectar. Silencioso si no. */
async function tryRegisterBackgroundSync() {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  try {
    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync: { register(tag: string): Promise<void> };
    };
    await registration.sync.register(BACKGROUND_SYNC_TAG);
  } catch {
    // Best-effort: permiso denegado, o carrera con la activación del SW.
  }
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useSyncExternalStore(
    subscribeToConnectivity,
    getConnectivitySnapshot,
    getServerConnectivitySnapshot
  );
  const [isDraining, setIsDraining] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [pendingMutations, setPendingMutations] = useState<QueuedRecord[]>([]);
  const router = useRouter();
  const { t } = useI18n();
  const { push } = useToast();
  const notifyAchievements = useAchievementToast();
  const draining = useRef(false);

  const refreshQueue = useCallback(async () => {
    const queued = await getQueuedMutations();
    setPendingMutations(queued);
    return queued;
  }, []);

  const drainQueue = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;
    setIsDraining(true);
    try {
      const queued = await refreshQueue();
      for (const mutation of queued) {
        const result = await replay(mutation);
        if (result && "unlocked" in result && result.unlocked) notifyAchievements(result.unlocked);
        if (result && "freezeQuotaExhausted" in result && result.freezeQuotaExhausted) {
          push(t("checkin.freezeQuotaExhausted"));
        }
        await removeQueuedMutation(mutation.id);
      }
      if (queued.length > 0) {
        await refreshQueue();
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
  }, [notifyAchievements, push, refreshQueue, router, t]);

  useEffect(() => {
    // Lee el estado de la cola (IndexedDB) al montar; no es estado derivable en render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshQueue();
  }, [refreshQueue]);

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

  useEffect(() => {
    // Mejora progresiva: si el Service Worker nos avisa (Background Sync), reintenta también.
    if (!("serviceWorker" in navigator)) return;
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "drain-queue") drainQueueRef.current();
    }
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  const runOrQueue = useCallback(
    async (mutation: QueuedMutation) => {
      if (!navigator.onLine) {
        await enqueueMutation(mutation);
        await refreshQueue();
        await tryRegisterBackgroundSync();
        return;
      }
      try {
        const result = await replay(mutation);
        if (result && "unlocked" in result && result.unlocked) notifyAchievements(result.unlocked);
      } catch {
        await enqueueMutation(mutation);
        await refreshQueue();
        await tryRegisterBackgroundSync();
      }
    },
    [notifyAchievements, refreshQueue]
  );

  const syncState: SyncState = !isOnline ? "offline" : isDraining ? "syncing" : justSynced ? "synced" : "idle";

  return (
    <OfflineContext.Provider
      value={{ isOnline, syncState, pendingCount: pendingMutations.length, pendingMutations, runOrQueue }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline debe usarse dentro de <OfflineProvider>");
  return ctx;
}
