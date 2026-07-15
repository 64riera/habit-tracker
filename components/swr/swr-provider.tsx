"use client";

import { useEffect, useRef, useState } from "react";
import { SWRConfig, useSWRConfig } from "swr";
import { createIndexedDBSWRProvider } from "@/lib/swr/idb-cache-provider";

/** Broadcasts the IndexedDB hydration to any `useSWR` hooks already mounted
 * before it resolved (a handful of ms after first paint) — writing directly
 * into the cache Map doesn't itself trigger a re-render. Any hard/SSR'd
 * first paint is already covered by each hook's `fallbackData`, so this gap
 * is never visible as a flash. */
function HydrationBroadcaster({ hydrate }: { hydrate: () => Promise<void> }) {
  const { mutate } = useSWRConfig();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate().then(() => mutate(() => true, undefined, { revalidate: false }));
  }, [hydrate, mutate]);

  return null;
}

export function SWRConfigProvider({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  // Lazy initializer: runs once per mounted instance, unlike a plain
  // `useState(createIndexedDBSWRProvider(userId))` call which would re-run
  // the factory (harmlessly, but pointlessly) on every render. `userId`
  // scopes which IndexedDB database this provider reads/writes (see
  // lib/swr/idb-cache-provider.ts) so one account's cached data can never
  // render under another account on a shared device.
  const [{ cache, hydrate }] = useState(() => createIndexedDBSWRProvider(userId));

  return (
    <SWRConfig value={{ provider: () => cache }}>
      <HydrationBroadcaster hydrate={hydrate} />
      {children}
    </SWRConfig>
  );
}
