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
    <SWRConfig
      value={{
        provider: () => cache,
        // Reconnect and (for realtime-tagged sections) remote-change
        // revalidation are already handled explicitly by OfflineProvider +
        // RealtimeProvider (see lib/swr/resync-everything.ts and
        // lib/offline/client.tsx) — those know exactly which keys actually
        // need a fresh read. Leaving these on their SWR defaults meant
        // every mounted key re-fetched again on top of that, on every tab
        // focus and every reconnect.
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }}
    >
      <HydrationBroadcaster hydrate={hydrate} />
      {children}
    </SWRConfig>
  );
}
