"use client";

import { useCallback, useEffect, useState } from "react";
import { getActiveTimerAction } from "@/lib/actions/metronome";
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
 */
export function useLiveTimer(initialTimer: TimerRow | null) {
  const [timer, setTimer] = useState(initialTimer);
  const [now, setNow] = useState(() => new Date());

  const resync = useCallback(async () => {
    const fresh = await getActiveTimerAction();
    setTimer(fresh);
    setNow(new Date());
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") resync();
    }
    window.addEventListener("focus", resync);
    window.addEventListener("online", resync);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", resync);
      window.removeEventListener("online", resync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [resync]);

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
