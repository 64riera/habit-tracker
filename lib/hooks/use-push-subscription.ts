"use client";

import { useEffect, useState, useTransition } from "react";
import { useHasMounted } from "./use-has-mounted";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions/push";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";

export type PushBrowserState = "unsupported" | "denied" | "unsubscribed";

// The server can't know whether the browser already has notifications
// blocked or whether it supports the Push API — reading it into the
// initial useState value would mismatch the server HTML against what the
// client builds on hydration. It's read fresh on every render, gated by
// `useHasMounted()` (same pattern as ThemeToggle): before mounting it
// always assumes "unsubscribed", just like the server.
function detectBrowserState(): PushBrowserState {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "unsubscribed";
}

/**
 * Push subscription state and actions, shared between the Settings toggle
 * (`PushToggle`) and the contextual prompt when setting up a habit
 * reminder (`HabitForm`) — the "request permission + subscribe" logic
 * lives in one place instead of being duplicated between the two.
 */
export function usePushSubscription() {
  const mounted = useHasMounted();
  const [subscribed, setSubscribed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const browserState: PushBrowserState = mounted ? detectBrowserState() : "unsubscribed";
  const canCheckSubscription = mounted && browserState === "unsubscribed" && !subscribed;

  useEffect(() => {
    if (!canCheckSubscription) return;
    navigator.serviceWorker.ready.then((registration) =>
      registration.pushManager.getSubscription().then((sub) => {
        if (sub) setSubscribed(true);
      })
    );
  }, [canCheckSubscription]);

  function subscribe() {
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) return;
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // Cast: the DOM BufferSource signature in TS 5.9 specifically
          // requires Uint8Array<ArrayBuffer>, but at runtime any Uint8Array works fine.
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
        await subscribeToPush({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
        setSubscribed(true);
      } catch {
        // e.g. the browser rejects pushManager.subscribe() (quota, ephemeral
        // profile, etc.) — don't leave the promise unhandled, just fail to activate.
      }
    });
  }

  function unsubscribe() {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await unsubscribeFromPush(subscription.endpoint);
          await subscription.unsubscribe();
        }
      } finally {
        setSubscribed(false);
      }
    });
  }

  return { mounted, browserState, subscribed, isPending, subscribe, unsubscribe };
}
