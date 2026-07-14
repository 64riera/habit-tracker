"use client";

import type { Cache, State } from "swr";

const DB_NAME = "justgo-swr-cache";
const STORE_NAME = "cache";
const RECORD_ID = "cache";
const FLUSH_DEBOUNCE_MS = 400;

type CacheEntry = [string, State];

/** Pure, unit-testable: a SWR cache Map <-> the plain array IndexedDB stores. */
export function serializeCache(map: Map<string, State>): CacheEntry[] {
  return Array.from(map.entries());
}

export function hydrateCache(entries: CacheEntry[]): Map<string, State> {
  return new Map(entries);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readPersistedCache(): Promise<CacheEntry[]> {
  const db = await openDb();
  const result = await new Promise<{ id: string; entries: CacheEntry[] } | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(RECORD_ID);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result?.entries ?? [];
}

async function writePersistedCache(entries: CacheEntry[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id: RECORD_ID, entries });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * A SWR `provider` backed by IndexedDB, so cached reads survive a full page
 * reload while offline (the default in-memory-only cache does not — it's
 * the one gap the Service Worker's page/flight caches don't cover, since
 * those store HTTP responses, not the parsed values SWR's subscribers read).
 *
 * The Map itself must be returned synchronously (SWR's requirement); it
 * starts empty and is hydrated from IndexedDB shortly after, then broadcast
 * to already-mounted hooks by the caller (see components/swr/swr-provider.tsx).
 */
export function createIndexedDBSWRProvider(): { cache: Cache; hydrate: () => Promise<void> } {
  const map = new Map<string, State>();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleFlush() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_DEBOUNCE_MS);
  }

  function flush() {
    flushTimer = null;
    writePersistedCache(serializeCache(map)).catch(() => {
      // Best-effort: a lost flush just means the next hydration is a bit stale.
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    window.addEventListener("pagehide", flush);
  }

  const cache: Cache = {
    keys: () => map.keys(),
    get: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
      scheduleFlush();
    },
    delete: (key) => {
      map.delete(key);
      scheduleFlush();
    },
  };

  async function hydrate() {
    const entries = await readPersistedCache();
    for (const [key, value] of hydrateCache(entries)) map.set(key, value);
  }

  return { cache, hydrate };
}
