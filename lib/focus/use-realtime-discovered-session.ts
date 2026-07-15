"use client";

import { useEffect, useRef, useState } from "react";
import { getActiveFocusSessionAction } from "@/lib/actions/focus";
import { subscribeToRealtimeSync } from "@/lib/realtime/client";
import { LIVE_STATUSES, type FocusSessionRow } from "@/lib/focus/compute";

/**
 * Layers a realtime-discovered session on top of a server-provided one, so
 * a component currently showing "no active session" (the start form, or
 * simply nothing — see FocusClient/FocusHeaderChip/MiniFocusIndicator)
 * finds out the moment *another* device starts one. Nothing else is
 * mounted at that point to notice the "focus" push: `useLiveFocusState`
 * only exists once a session already exists to display, which is exactly
 * the gap this closes — without it, a device sitting on the start form
 * (or on some other screen entirely) never learns a session began
 * elsewhere until its next unrelated reload.
 *
 * Stops reacting once a session is actually live: from that point,
 * whatever wraps `useLiveFocusState` handles further "focus" pushes
 * directly with a single, cheaper server action call, so this doesn't
 * also fetch on the same push and duplicate that work.
 */
export function useRealtimeDiscoveredSession(session: FocusSessionRow | null): FocusSessionRow | null {
  const [discovered, setDiscovered] = useState<FocusSessionRow | null | undefined>(undefined);

  // A fresh server-provided `session` (a real navigation/reload) resets
  // any stale discovery — it can't outlive the render it came from.
  const [prevSession, setPrevSession] = useState(session);
  if (session !== prevSession) {
    setPrevSession(session);
    setDiscovered(undefined);
  }

  const effective = discovered !== undefined ? discovered : session;
  const isLive = effective !== null && LIVE_STATUSES.includes(effective.status);
  const isLiveRef = useRef(isLive);
  useEffect(() => {
    isLiveRef.current = isLive;
  });

  useEffect(() => {
    return subscribeToRealtimeSync("focus", () => {
      if (isLiveRef.current) return;
      // Rewards only ever unlock on *finishing* a session, never on
      // discovering one that just started elsewhere — `unlockedTiers` is
      // deliberately ignored here; once this hands off to
      // `useLiveFocusState`, that hook's own `onUnlocked` covers it.
      getActiveFocusSessionAction().then(({ session: fresh }) => setDiscovered(fresh));
    });
  }, []);

  return effective;
}
