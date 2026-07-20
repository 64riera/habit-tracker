"use client";

import { useEffect, useRef, useTransition } from "react";

/**
 * Sequences rapid-fire async calls so that at most one is ever in flight.
 * A dispatch while a call is already running just records the latest
 * desired value instead of firing an overlapping call; the in-flight call
 * rechecks the desired value once it settles and keeps draining until
 * nothing new came in. Without this, two rapid taps (e.g. double-tapping a
 * check-in) fire two independent, unsequenced calls that can resolve out
 * of order — whichever happens to finish last on the server wins, not
 * necessarily the user's actual last tap.
 *
 * `value` must never legitimately be `null` — it's the sentinel for "no
 * pending dispatch".
 */
export function useSequencedAction<T>(perform: (value: T) => Promise<void>, onDrained?: () => void) {
  const [, startTransition] = useTransition();
  const pendingRef = useRef(false);
  const desiredRef = useRef<T | null>(null);
  const performRef = useRef(perform);
  const onDrainedRef = useRef(onDrained);
  useEffect(() => {
    performRef.current = perform;
    onDrainedRef.current = onDrained;
  });

  return function dispatch(value: T) {
    desiredRef.current = value;
    if (pendingRef.current) return;

    pendingRef.current = true;
    startTransition(async () => {
      while (desiredRef.current !== null) {
        const next = desiredRef.current;
        desiredRef.current = null;
        await performRef.current(next);
      }
      pendingRef.current = false;
      onDrainedRef.current?.();
    });
  };
}
