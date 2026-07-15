"use client";

import { useCallback, useEffect, useState } from "react";
import { remainingSeconds, isFinished, type TimerRow } from "@/lib/metronome/timer-compute";

/**
 * Displays a timer whose real state lives server-side (see
 * lib/actions/metronome.ts) — this hook never invents time on its own. The
 * 1s interval only forces a re-render so the displayed countdown ticks
 * smoothly while the tab is open; the actual remaining time is always
 * `remainingSeconds(timer, now)`, recomputed from the stored timestamps.
 * Resyncing on mount/focus/reconnect is what makes the timer correct after
 * the app was fully closed: there's no local state to lose in the first
 * place, just a fresh read of what the server already knows.
 *
 * `resync` is injected rather than hardcoded so the caller can short-circuit
 * it while offline or while a locally-queued "ghost" timer (see
 * lib/offline/pending-selectors.ts) hasn't synced yet — same reasoning as
 * lib/focus/use-live-focus-state.ts.
 */
export function useLiveTimer(initialTimer: TimerRow | null, resync: () => Promise<TimerRow | null>) {
  const [timer, setTimer] = useState(initialTimer);
  const [now, setNow] = useState(() => new Date());

  // "Adjusting state during render" (see metronome-panel.tsx for the same
  // pattern) — adopts a new `initialTimer` prop the instant it changes
  // (e.g. the parent recomputed the offline ghost after a queued action),
  // instead of waiting an extra frame for an effect to notice.
  const [prevInitialTimer, setPrevInitialTimer] = useState(initialTimer);
  if (initialTimer !== prevInitialTimer) {
    setPrevInitialTimer(initialTimer);
    setTimer(initialTimer);
  }

  const runResync = useCallback(async () => {
    const fresh = await resync();
    setTimer(fresh);
    setNow(new Date());
  }, [resync]);

  useEffect(() => {
    // Not subscribed to realtime pushes: the metronome timer isn't one of
    // the three domains realtime is scoped to (see lib/realtime/domain.ts)
    // — a personal countdown/kitchen-timer utility isn't worth an instant
    // cross-device push for, and it already stays correct across devices
    // on the next focus/reconnect, same as before realtime existed.
    function onVisibilityChange() {
      if (document.visibilityState === "visible") runResync();
    }
    window.addEventListener("focus", runResync);
    window.addEventListener("online", runResync);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", runResync);
      window.removeEventListener("online", runResync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [runResync]);

  useEffect(() => {
    if (timer?.status !== "running") return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [timer?.status]);

  return {
    timer,
    setTimer,
    remaining: timer ? remainingSeconds(timer, now) : 0,
    finished: timer ? isFinished(timer, now) : false,
  };
}
