"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { enqueueMutation, getQueuedMutations, removeQueuedMutation } from "@/lib/offline/db";
import type { QueuedMutation, QueuedRecord } from "@/lib/offline/db";
import { replay } from "@/lib/offline/replay-registry";
import { isLikelyNetworkError } from "@/lib/offline/network-error";
import { useAchievementToast, useToast } from "@/lib/toast/client";
import { useI18n } from "@/lib/i18n/client";
import { resyncEverything } from "@/lib/swr/resync-everything";
import { refreshVisitedSections } from "@/lib/swr/refresh-visited-sections";
import { sectionRegistry } from "@/lib/swr/sections";
import { getClientToday } from "@/lib/date-client";
import { subscribeToRealtimeSync } from "@/lib/realtime/client";
import type { RealtimeDomain } from "@/lib/realtime/domain";

/** Domains a realtime push can arrive for that this device should react to
 * with a targeted section refresh — "focus" isn't here because the live
 * session isn't SWR-backed at all; it reacts to its own "focus" pushes
 * directly (see useLiveFocusState), more cheaply than a section refresh. */
const REALTIME_SECTION_DOMAINS: RealtimeDomain[] = ["habits", "finance"];

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
  const { cache, mutate: globalMutate } = useSWRConfig();
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
        try {
          const result = await replay(mutation);
          if (result && "unlocked" in result && result.unlocked) notifyAchievements(result.unlocked);
          if (result && "freezeQuotaExhausted" in result && result.freezeQuotaExhausted) {
            push(t("checkin.freezeQuotaExhausted"));
          }
          await removeQueuedMutation(mutation.id);
        } catch (error) {
          if (isLikelyNetworkError(error, navigator.onLine)) {
            // Still genuinely offline (or a transient blip): stop here, this
            // mutation and everything queued after it retry on the next
            // reconnect, in order.
            break;
          }
          // The server was reached and rejected this mutation (e.g. it
          // targets a record another device already deleted or changed
          // incompatibly) — retrying the exact same payload would just fail
          // again forever and block every mutation queued behind it.
          // Dropping it is the only way to keep the queue moving.
          await removeQueuedMutation(mutation.id);
          push(t("offline.mutationDropped"));
        }
      }
      await refreshQueue();
      // Brings this device up to date unconditionally, even with nothing
      // queued — simply regaining connectivity is enough to catch up on
      // writes made from another device meanwhile (same reasoning as the
      // realtime-triggered resync below, see lib/swr/resync-everything.ts).
      await resyncEverything({ cache, mutate: globalMutate, router });
      const syncedAt = Date.now();
      setLastSyncedAt(syncedAt);
      window.localStorage.setItem(LAST_SYNCED_AT_KEY, String(syncedAt));
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), SYNCED_BANNER_MS);
    } catch {
      // Still genuinely offline: will retry on the next "online" event.
    } finally {
      draining.current = false;
      setIsDraining(false);
    }
  }, [cache, globalMutate, notifyAchievements, push, refreshQueue, router, t]);

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
    // Retries the queue when the browser regains connectivity (real external
    // event) — deliberately re-checks the *live* navigator.onLine here
    // instead of trusting the `isOnline` state captured in this render's
    // closure. That state comes from useSyncExternalStore, which serves
    // `getServerConnectivitySnapshot` (hardcoded `true`) for one render
    // whenever it differs from the real client snapshot, to avoid a
    // hydration mismatch — and effects fire based on whatever was actually
    // committed. On a page loaded from the Service Worker's offline cache
    // (a document that was fetched, and thus rendered, while online), that
    // first render *is* the mismatched one: `isOnline` briefly reads `true`
    // even though the device is genuinely offline, this same effect fires
    // believing it should sync, calls drainQueue -> resyncEverything, whose
    // router.refresh()/router.prefetch() calls fail immediately — and any
    // uncaught failure during a pending client-side navigation makes
    // Next.js fall back to a hard reload (see node_modules/next/dist/client
    // /components/nav-failure-handler.js), which repeats the exact same
    // mismatch on the next load, forever. A live read here can't be stale.
    if (isOnline && navigator.onLine) drainQueueRef.current();
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

  useEffect(() => {
    // Another device just changed something in a specific domain (see
    // lib/realtime/client.tsx) — deliberately *not* the same path as
    // reconnect: this device isn't catching up after being offline, it
    // already knows exactly what changed and where, so it only refreshes
    // that domain's already-visited sections (see sectionRegistry's
    // `realtimeDomain` tags) instead of the whole app. No re-entrancy
    // guard here on purpose — `refreshVisitedSections` is a cheap,
    // idempotent read-and-overwrite, so letting two overlapping calls run
    // concurrently is harmless, unlike drainQueue's replay loop above.
    // Silently dropping a concurrent call the way that guard would have
    // meant a rapid second change (pause right after start, from another
    // device) could get lost until some unrelated later trigger.
    const unsubscribes = REALTIME_SECTION_DOMAINS.map((domain) =>
      subscribeToRealtimeSync(domain, () => {
        const sections = sectionRegistry.filter((section) => section.realtimeDomain === domain);
        refreshVisitedSections(cache, globalMutate, getClientToday(), sections);
      })
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [cache, globalMutate]);

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
