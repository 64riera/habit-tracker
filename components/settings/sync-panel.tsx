"use client";

import { RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import { pendingMutationsByDomain, type PendingDomain } from "@/lib/offline/pending-selectors";

const DOMAIN_LABEL_KEY: Record<PendingDomain, string> = {
  habits: "offline.domainHabits",
  routines: "offline.domainRoutines",
  tasks: "offline.domainTasks",
  finance: "offline.domainFinance",
  categories: "offline.domainCategories",
  focus: "offline.domainFocus",
  gym: "offline.domainGym",
  metronome: "offline.domainMetronome",
};

/** Sync status + manual "sync now", scoped to Settings — the global floating
 * banner this replaced showed the same "offline/syncing/synced" state on
 * every screen; per-row PendingSyncBadge (used in habit/task/transaction
 * lists) already gives in-context awareness elsewhere, so this detailed
 * breakdown only needs to live in one place. */
export function SyncPanel() {
  const { t, locale } = useI18n();
  const { isOnline, syncState, pendingCount, pendingMutations, lastSyncedAt, drainQueue } = useOffline();

  const breakdown = pendingMutationsByDomain(pendingMutations);
  const domainRows = (Object.entries(breakdown) as [PendingDomain, number][]).filter(([, count]) => count > 0);

  const lastSyncedLabel = lastSyncedAt
    ? new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(lastSyncedAt)
    : t("settings.syncNever");

  return (
    <div className="border-b border-border py-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13.5px] font-medium">{t("settings.syncSectionTitle")}</div>
          <div className="mt-0.5 text-[11px] text-muted">
            {isOnline ? t("settings.lastSync") + ": " + lastSyncedLabel : t("offline.offline")}
          </div>
        </div>
        <button
          type="button"
          onClick={() => drainQueue()}
          disabled={!isOnline || syncState === "syncing"}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11.5px] font-medium disabled:opacity-50"
        >
          <RefreshCw size={12} strokeWidth={2} className={syncState === "syncing" ? "animate-spin" : undefined} aria-hidden />
          {t("settings.syncNow")}
        </button>
      </div>

      {pendingCount > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5">
          <div className="text-[11px] font-medium">
            {pendingCount === 1 ? t("settings.syncPendingCountSingular") : t("settings.syncPendingCount", { count: pendingCount })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {domainRows.map(([domain, count]) => (
              <span key={domain} className="text-[10.5px] text-muted">
                {t(DOMAIN_LABEL_KEY[domain])} · {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
