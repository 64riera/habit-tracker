"use client";

import { useI18n } from "@/lib/i18n/client";
import { usePushSubscription } from "@/lib/hooks/use-push-subscription";

export function PushToggle() {
  const { t } = useI18n();
  const { mounted, browserState, subscribed, isPending, subscribe, unsubscribe } = usePushSubscription();

  if (mounted && browserState === "unsupported") {
    return <span className="text-[11px] text-muted">{t("settings.notificationsUnsupported")}</span>;
  }
  if (mounted && browserState === "denied") {
    return <span className="text-[11px] text-muted">{t("settings.notificationsDenied")}</span>;
  }

  return (
    <button
      type="button"
      onClick={subscribed ? unsubscribe : subscribe}
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
