"use client";

import { useEffect, useRef } from "react";
import type PusherClient from "pusher-js";
import { privateUserChannel } from "@/lib/realtime/channel";
import type { RealtimeDomain } from "@/lib/realtime/domain";

/** Dispatched on `window` whenever a push arrives confirming some device
 * (this one or another) changed something in a given domain — `detail`
 * carries which one (see lib/realtime/domain.ts), so a subscriber can
 * react with a targeted, cheap refresh instead of resyncing the whole app
 * for every message. Use `subscribeToRealtimeSync` below rather than
 * listening for this directly — it already filters by domain.
 * `RealtimeProvider` itself still knows nothing about SWR, sections, or
 * timers — it only ever transports the signal. */
export const REALTIME_SYNC_EVENT = "justgo:sync";

/**
 * Subscribes to realtime pushes for exactly one domain, returning an
 * unsubscribe function — the one place that knows the event is a
 * `CustomEvent<RealtimeDomain>` and how to filter it, so every consumer
 * (OfflineProvider, useLiveFocusState) calls this instead of each
 * re-implementing `window.addEventListener` + a manual domain check.
 */
export function subscribeToRealtimeSync(domain: RealtimeDomain, handler: () => void): () => void {
  function onEvent(event: Event) {
    if ((event as CustomEvent<RealtimeDomain>).detail === domain) handler();
  }
  window.addEventListener(REALTIME_SYNC_EVENT, onEvent);
  return () => window.removeEventListener(REALTIME_SYNC_EVENT, onEvent);
}

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

/**
 * Purely additive: if `userId` is null (no session) or the app isn't
 * configured with Pusher keys, this renders `children` and does nothing
 * else — no connection attempt, no request, no console noise. The rest of
 * the app (OfflineProvider's reconnect/focus-triggered resync) already
 * works without this; realtime is only ever a faster path on top of that,
 * never a replacement for it.
 */
export function RealtimeProvider({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  const clientRef = useRef<PusherClient | null>(null);

  useEffect(() => {
    if (!userId || !PUSHER_KEY || !PUSHER_CLUSTER) return;

    let cancelled = false;
    import("pusher-js")
      .then(({ default: Pusher }) => {
        if (cancelled) return;
        const client = new Pusher(PUSHER_KEY!, {
          cluster: PUSHER_CLUSTER!,
          authEndpoint: "/api/realtime/auth",
        });
        clientRef.current = client;
        const channel = client.subscribe(privateUserChannel(userId));
        channel.bind("changed", (data: { domain: RealtimeDomain }) => {
          window.dispatchEvent(new CustomEvent<RealtimeDomain>(REALTIME_SYNC_EVENT, { detail: data.domain }));
        });
      })
      .catch((err) => {
        // Best-effort: SDK failed to load (network policy, ad blocker,
        // etc.) — fall back silently to the existing resync-on-reconnect.
        console.error("Pusher client failed to load:", err);
      });

    return () => {
      cancelled = true;
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [userId]);

  return children;
}
