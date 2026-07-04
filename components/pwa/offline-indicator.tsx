"use client";

import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";

export function OfflineIndicator() {
  const { t } = useI18n();
  const { syncState, pendingCount } = useOffline();

  if (syncState === "idle") return null;

  const label =
    syncState === "offline"
      ? pendingCount > 0
        ? `${t("offline.offline")} · ${pendingCount}`
        : t("offline.offline")
      : syncState === "syncing"
        ? t("offline.syncing")
        : t("offline.synced");

  return (
    <div className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-2">
      <div
        className="rounded-full border border-border bg-bg px-3.5 py-1.5 text-[11px] font-medium text-muted shadow-sm"
        role="status"
      >
        {label}
      </div>
    </div>
  );
}
