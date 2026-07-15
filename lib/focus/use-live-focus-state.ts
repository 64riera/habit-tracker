"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { computeFocusState, type FocusSessionRow, type FocusStateView } from "@/lib/focus/compute";
import type { FocusRewardTier } from "@/lib/focus/rewards";
import { subscribeToRealtimeSync } from "@/lib/realtime/client";

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
  // Set when a resync is requested *while one is already running* — e.g. a
  // realtime push for a pause arrives mid-flight for the resync a start
  // push just triggered. Without this, that second request would just be
  // dropped (see the old `if (isResyncingRef.current) return` below),
  // leaving this device showing a stale "running" session until some
  // unrelated later trigger (a focus/online event, or the next push)
  // happened to fire — exactly the "doesn't handle start/pause/stop well
  // across devices" symptom this fixes. Now it instead runs one more full
  // resync cycle immediately after the current one finishes, so whatever
  // the *latest* server state is always eventually lands, never silently
  // discarded.
  const pendingResyncRef = useRef(false);
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
    if (isResyncingRef.current) {
      pendingResyncRef.current = true;
      return;
    }
    isResyncingRef.current = true;
    try {
      do {
        pendingResyncRef.current = false;
        const { session: fresh, unlockedTiers } = await resync();
        setSession(fresh);
        setNow(new Date());
        if (unlockedTiers.length > 0) onUnlockedRef.current?.(unlockedTiers);
      } while (pendingResyncRef.current);
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
    // A "focus" push (see lib/realtime/notify.ts) means some device —
    // this one or another — started/paused/resumed/finished a session:
    // resync immediately instead of waiting for the next focus/online
    // event, which is what made another device's actions show up late (or
    // not at all, before the trailing-resync fix above). A single direct
    // server action call per push, not a whole-section refresh — the
    // cheapest reaction available for this domain.
    const unsubscribeRealtime = subscribeToRealtimeSync("focus", runResync);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", runResync);
      unsubscribeRealtime();
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
