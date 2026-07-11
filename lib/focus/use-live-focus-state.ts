"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { computeFocusState, type FocusSessionRow, type FocusStateView } from "@/lib/focus/compute";
import type { FocusRewardTier } from "@/lib/focus/rewards";

const TICK_MS = 1000;

type ResyncResult = { session: FocusSessionRow | null; unlockedTiers: FocusRewardTier[] };

/**
 * Purely cosmetic ticking: the `setInterval` here never writes anything,
 * it just re-renders the digits in memory from the last row the server
 * sent. What actually makes the session "keep running" is `resync` — it's
 * called on mount, when focus/connection is regained, and every time the
 * local computation detects that a transition must have already occurred
 * (active break, cap reached), so that the displayed status is never a
 * transition decided by the client alone, but always the one the server
 * confirmed. `onUnlocked` notifies if that same resync was the moment
 * reconciliation completed the session and unlocked rewards (e.g. the
 * user watches the countdown reach zero without tapping "Finish").
 */
export function useLiveFocusState(
  initialSession: FocusSessionRow | null,
  resync: () => Promise<ResyncResult>,
  onUnlocked?: (tiers: FocusRewardTier[]) => void
) {
  const [session, setSession] = useState(initialSession);
  const [now, setNow] = useState(() => new Date());
  const isResyncingRef = useRef(false);
  const onUnlockedRef = useRef(onUnlocked);
  useEffect(() => {
    onUnlockedRef.current = onUnlocked;
  }, [onUnlocked]);

  // State adjustment during render (React's documented pattern for
  // "resetting" state derived from a prop) instead of a separate effect:
  // if the server-render sent a different row (e.g. after a
  // router.refresh()), it's adopted immediately, with no extra frame in
  // between and without depending on another effect to sync it.
  const [prevInitialSession, setPrevInitialSession] = useState(initialSession);
  if (initialSession !== prevInitialSession) {
    setPrevInitialSession(initialSession);
    setSession(initialSession);
  }

  const runResync = useCallback(async () => {
    if (isResyncingRef.current) return;
    isResyncingRef.current = true;
    try {
      const { session: fresh, unlockedTiers } = await resync();
      setSession(fresh);
      setNow(new Date());
      if (unlockedTiers.length > 0) onUnlockedRef.current?.(unlockedTiers);
    } finally {
      isResyncingRef.current = false;
    }
  }, [resync]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    runResync();
    function onVisibilityChange() {
      if (document.visibilityState === "visible") runResync();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", runResync);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", runResync);
    };
  }, [runResync]);

  useEffect(() => {
    if (!session) return;
    const state = computeFocusState(session, now);
    if (state.dueForBreak || state.breakOver || state.overCap) runResync();
  }, [session, now, runResync]);

  const state: FocusStateView | null = session ? computeFocusState(session, now) : null;

  return { session, state, resync: runResync };
}
