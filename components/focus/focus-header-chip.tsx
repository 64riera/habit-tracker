"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { useFocusRewardToast } from "@/lib/toast/client";
import { useLiveFocusState } from "@/lib/focus/use-live-focus-state";
import { useFocusStatusAlerts } from "@/lib/focus/use-focus-status-alerts";
import { getActiveFocusSessionAction } from "@/lib/actions/focus";
import { formatClock } from "@/lib/focus/format";
import { LIVE_STATUSES, type FocusSessionRow } from "@/lib/focus/compute";
import { useOffline } from "@/lib/offline/client";
import { pendingFocusSession } from "@/lib/offline/pending-selectors";
import { useRealtimeDiscoveredSession } from "@/lib/focus/use-realtime-discovered-session";
import { getClientToday } from "@/lib/date-client";
import { PendingSyncBadge } from "@/components/offline/pending-sync-badge";

/**
 * Live focus session chip, for the `headerAccessory` slot of `ContentHeader`
 * on Today. Only exists while a session is in progress — with no session
 * there's nothing to show there (that's what the "Focus" nav tab is for).
 * Replaces the floating `MiniFocusIndicator` while on Today (see the
 * `pathname === "/"` check in that component) — the two are never mounted
 * at the same time, so the ticking/sound and title alerts live here without
 * risk of duplication.
 */
export function FocusHeaderChip({
  session,
  soundEnabled,
}: {
  session: FocusSessionRow | null;
  soundEnabled: boolean;
}) {
  const { pendingMutations } = useOffline();
  const pendingSession = useMemo(
    () => pendingFocusSession(pendingMutations, getClientToday()),
    [pendingMutations]
  );
  // Picks up a session another device started while this chip had nothing
  // to show — see the hook's docs for why that gap needs its own handling.
  const realtimeSession = useRealtimeDiscoveredSession(session);
  const effectiveSession = pendingSession !== undefined ? pendingSession : realtimeSession;
  if (!effectiveSession) return null;
  return (
    <ActiveChip
      initialSession={effectiveSession}
      soundEnabled={soundEnabled}
      pendingSync={pendingSession !== undefined}
    />
  );
}

function ActiveChip({
  initialSession,
  soundEnabled,
  pendingSync,
}: {
  initialSession: FocusSessionRow;
  soundEnabled: boolean;
  pendingSync: boolean;
}) {
  const { t } = useI18n();
  const notifyRewards = useFocusRewardToast();
  const resync = useCallback(async () => {
    if (pendingSync) return { session: initialSession, unlockedTiers: [] };
    return getActiveFocusSessionAction();
  }, [pendingSync, initialSession]);
  const { session, state } = useLiveFocusState(initialSession, resync, notifyRewards);
  useFocusStatusAlerts(session, soundEnabled);

  if (!session || !state || !LIVE_STATUSES.includes(session.status)) return null;

  const bigValueSeconds = session.mode === "countdown" ? (state.remainingSeconds ?? 0) : state.activeSeconds;

  return (
    <Link
      href="/focus"
      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11.5px] font-medium tabular-nums transition-colors"
    >
      <span className="relative flex size-1.5 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
      </span>
      <span>{formatClock(bigValueSeconds)}</span>
      <span className="text-muted">{t(`focus.status.${session.status}`)}</span>
      {pendingSync && <PendingSyncBadge />}
    </Link>
  );
}
