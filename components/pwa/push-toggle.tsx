"use client";

import { useEffect, useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions/push";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";

type PushState = "unsupported" | "denied" | "unsubscribed" | "subscribed";

// Los checks sincrónicos (soporte del navegador, permiso ya bloqueado) se
// resuelven en el valor inicial de useState, no dentro de un efecto: solo la
// verificación de si ya existe una suscripción es genuinamente async.
function detectInitialState(): PushState {
  if (typeof window === "undefined") return "unsubscribed";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "unsubscribed";
}

export function PushToggle() {
  const { t } = useI18n();
  const [state, setState] = useState<PushState>(detectInitialState);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state !== "unsubscribed") return;
    navigator.serviceWorker.ready.then((registration) =>
      registration.pushManager.getSubscription().then((sub) => {
        if (sub) setState("subscribed");
      })
    );
  }, [state]);

  function enable() {
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "unsubscribed");
          return;
        }
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
        setState("subscribed");
      } catch {
        // p. ej. el navegador rechaza pushManager.subscribe() (cuota, perfil
        // efímero, etc.) — no dejar la promesa sin manejar, solo quedarse sin activar.
        setState("unsubscribed");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await unsubscribeFromPush(subscription.endpoint);
          await subscription.unsubscribe();
        }
      } finally {
        setState("unsubscribed");
      }
    });
  }

  if (state === "unsupported") {
    return <span className="text-[11px] text-muted">{t("settings.notificationsUnsupported")}</span>;
  }
  if (state === "denied") {
    return <span className="text-[11px] text-muted">{t("settings.notificationsDenied")}</span>;
  }

  const subscribed = state === "subscribed";
  return (
    <button
      type="button"
      onClick={subscribed ? disable : enable}
      disabled={isPending}
      aria-pressed={subscribed}
      className="rounded-full border border-border px-3 py-1 text-[11.5px] font-medium transition-colors disabled:opacity-60"
      style={
        subscribed
          ? { background: "var(--color-accent)", color: "var(--color-accent-contrast)", borderColor: "transparent" }
          : undefined
      }
    >
      {subscribed ? t("settings.notificationsDisable") : t("settings.notificationsEnable")}
    </button>
  );
}
