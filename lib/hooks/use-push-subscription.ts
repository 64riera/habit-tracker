"use client";

import { useEffect, useState, useTransition } from "react";
import { useHasMounted } from "./use-has-mounted";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions/push";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";

export type PushBrowserState = "unsupported" | "denied" | "unsubscribed";

// El servidor no puede saber si el navegador tiene notificaciones ya
// bloqueadas o si soporta Push API — leerlo en el valor inicial de
// useState desalinea el HTML del servidor del que arma el cliente al
// hidratar. Se lee fresco en cada render, gateado por `useHasMounted()`
// (mismo patrón que ThemeToggle): antes de montar siempre se asume
// "unsubscribed", igual que el servidor.
function detectBrowserState(): PushBrowserState {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "unsubscribed";
}

/**
 * Estado y acciones de suscripción push, compartido entre el toggle de
 * Ajustes (`PushToggle`) y el pedido contextual al configurar un
 * recordatorio de hábito (`HabitForm`) — la lógica de "pedir permiso +
 * suscribir" vive en un solo lugar en vez de duplicarse entre los dos.
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
          // Cast: la firma DOM de BufferSource en TS 5.9 exige Uint8Array<ArrayBuffer>
          // específicamente, pero en runtime cualquier Uint8Array funciona igual.
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
        await subscribeToPush({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
        setSubscribed(true);
      } catch {
        // p. ej. el navegador rechaza pushManager.subscribe() (cuota, perfil
        // efímero, etc.) — no dejar la promesa sin manejar, solo quedarse sin activar.
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
