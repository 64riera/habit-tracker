"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Timer } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useFocusRewardToast } from "@/lib/toast/client";
import { useLiveFocusState } from "@/lib/focus/use-live-focus-state";
import { useFocusStatusAlerts } from "@/lib/focus/use-focus-status-alerts";
import { getActiveFocusSessionAction } from "@/lib/actions/focus";
import { formatClock } from "@/lib/focus/format";
import { LIVE_STATUSES, type FocusSessionRow } from "@/lib/focus/compute";
import { hasFocusHeaderSlot } from "@/lib/focus/header-slot";
import { useOffline } from "@/lib/offline/client";
import { pendingFocusSession } from "@/lib/offline/pending-selectors";
import { useRealtimeDiscoveredSession } from "@/lib/focus/use-realtime-discovered-session";
import { getClientToday } from "@/lib/date-client";
import { PendingSyncBadge } from "@/components/offline/pending-sync-badge";

/**
 * Floating pill visible on any dashboard route except /focus (the full
 * session is already visible there) and the ones in `hasFocusHeaderSlot`
 * (those screens show the same state as `FocusHeaderChip` in their own
 * header, which is also what triggers the sound/title alerts there —
 * this prevents both from being mounted at the same time and duplicating
 * them). Only mounts the ticking hook if there's an active session to
 * begin with — otherwise there'd be a `setInterval` running forever on
 * every page of the app with nothing to show.
 */
export function MiniFocusIndicator({
  session,
  soundEnabled,
}: {
  session: FocusSessionRow | null;
  soundEnabled: boolean;
}) {
  const { pendingMutations } = useOffline();
  // A session started offline never reaches this component through
  // `session` (that prop only ever comes from the server) — without this,
  // the floating indicator simply wouldn't exist until the queue drains.
  const pendingSession = useMemo(
    () => pendingFocusSession(pendingMutations, getClientToday()),
    [pendingMutations]
  );
  // Picks up a session another device started while this pill had nothing
  // to show — see the hook's docs for why that gap needs its own handling.
  const realtimeSession = useRealtimeDiscoveredSession(session);
  const effectiveSession = pendingSession !== undefined ? pendingSession : realtimeSession;
  if (!effectiveSession) return null;
  return (
    <MiniFocusIndicatorActive
      initialSession={effectiveSession}
      soundEnabled={soundEnabled}
      pendingSync={pendingSession !== undefined}
    />
  );
}

function MiniFocusIndicatorActive({
  initialSession,
  soundEnabled,
  pendingSync,
}: {
  initialSession: FocusSessionRow;
  soundEnabled: boolean;
  pendingSync: boolean;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const notifyRewards = useFocusRewardToast();
  const resync = useCallback(async () => {
    if (pendingSync) return { session: initialSession, unlockedTiers: [] };
    return getActiveFocusSessionAction();
  }, [pendingSync, initialSession]);
  const { session, state } = useLiveFocusState(initialSession, resync, notifyRewards);
  useFocusStatusAlerts(session, soundEnabled);

  if (!session || !state || !LIVE_STATUSES.includes(session.status)) return null;
  if (pathname.startsWith("/focus") || hasFocusHeaderSlot(pathname)) return null;

  const bigValueSeconds = session.mode === "countdown" ? state.remainingSeconds ?? 0 : state.activeSeconds;

  return (
    <Link
      href="/focus"
      className="fixed right-4 bottom-20 z-40 flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-[12px] shadow-[0_10px_24px_-14px_var(--header-shadow)] md:right-6 md:bottom-6"
    >
      <Timer size={13} strokeWidth={2} className="text-muted" aria-hidden />
      <span className="font-medium tabular-nums">{formatClock(bigValueSeconds)}</span>
      <span className="text-muted">{t(`focus.status.${session.status}`)}</span>
      {pendingSync && <PendingSyncBadge />}
    </Link>
  );
}
