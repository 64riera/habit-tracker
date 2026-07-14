"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
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
  /** Epoch ms of the last successful queue drain, or null if never (this
   * session or any prior one) — persisted so it survives a reload. */
  lastSyncedAt: number | null;
  /** Replays every queued mutation now, instead of waiting for the next
   * "online" event. Exposed for the manual "Sync now" button in Settings —
   * already safe to call anytime, drainQueue is re-entrancy-guarded. */
  drainQueue: () => Promise<void>;
  /** Tries to run the mutation; if it fails or there's no connection, queues it for retry on reconnect. */
  runOrQueue: (mutation: QueuedMutation) => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

const SYNCED_BANNER_MS = 2500;
const BACKGROUND_SYNC_TAG = "sync-mutations";
const LAST_SYNCED_AT_KEY = "justgo:last-synced-at";

function readLastSyncedAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LAST_SYNCED_AT_KEY);
  return raw ? Number(raw) : null;
}

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

/** Progressive enhancement: if the browser supports Background Sync, ask it to wake us up on reconnect. Silent if not. */
async function tryRegisterBackgroundSync() {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  try {
    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync: { register(tag: string): Promise<void> };
    };
    await registration.sync.register(BACKGROUND_SYNC_TAG);
  } catch {
    // Best-effort: permission denied, or a race with the SW activation.
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
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const router = useRouter();
  const { t } = useI18n();
  const { push } = useToast();
  const notifyAchievements = useAchievementToast();
  const { mutate: globalMutate } = useSWRConfig();
  const draining = useRef(false);

  useEffect(() => {
    // Reads localStorage on mount; not derivable state during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSyncedAt(readLastSyncedAt());
  }, []);

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
        // Revalidates every currently-mounted SWR key (cheap: only routes
        // actually on screen refetch, see lib/swr — SWR's global mutate is
        // a no-op for keys with no mounted hook) and still refreshes the
        // Server Component tree for anything not yet migrated to SWR, or
        // derived from a cookie no SWR key covers (e.g. `today`).
        globalMutate(() => true);
        router.refresh();
        const syncedAt = Date.now();
        setLastSyncedAt(syncedAt);
        window.localStorage.setItem(LAST_SYNCED_AT_KEY, String(syncedAt));
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), SYNCED_BANNER_MS);
      }
    } catch {
      // Still genuinely offline: will retry on the next "online" event.
    } finally {
      draining.current = false;
      setIsDraining(false);
    }
  }, [globalMutate, notifyAchievements, push, refreshQueue, router, t]);

  useEffect(() => {
    // Reads the queue state (IndexedDB) on mount; it's not derivable state during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshQueue();
  }, [refreshQueue]);

  // `drainQueue` is recreated when its dependencies change (e.g. `t` after a
  // router.refresh()); storing it in a ref prevents that identity change
  // alone from triggering the effect below, which caused a cycle:
  // refresh -> new `t` -> new drainQueue -> effect -> refresh -> ...
  const drainQueueRef = useRef(drainQueue);
  useEffect(() => {
    drainQueueRef.current = drainQueue;
  });

  useEffect(() => {
    // Retries the queue when the browser regains connectivity (real external event).
    if (isOnline) drainQueueRef.current();
  }, [isOnline]);

  useEffect(() => {
    // Progressive enhancement: if the Service Worker notifies us (Background Sync), retry as well.
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
      value={{
        isOnline,
        syncState,
        pendingCount: pendingMutations.length,
        pendingMutations,
        lastSyncedAt,
        drainQueue,
        runOrQueue,
      }}
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
