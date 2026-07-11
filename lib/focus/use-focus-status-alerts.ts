"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/client";
import { flashTitle, playChime } from "@/lib/focus/alerts";
import type { FocusSessionRow } from "@/lib/focus/compute";
import { APP_NAME } from "@/lib/branding";

/**
 * Fires the sound/title-flash alert on *entering* "on_break" or
 * "completed" — it detects the transition (compares against the previous
 * status), not the current state, so the alert doesn't repeat on every
 * re-render while the status stays the same. Shared between
 * `FocusTimerDisplay` and `MiniFocusIndicator`: they're never mounted at
 * the same time (the indicator hides itself on /focus), so there's no
 * risk of firing the alert twice for the same session.
 */
export function useFocusStatusAlerts(session: FocusSessionRow | null, soundEnabled: boolean) {
  const { t } = useI18n();
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const current = session?.status ?? null;
    prevStatusRef.current = current;
    if (!current || prev === current) return;

    if (current === "on_break") {
      if (soundEnabled) playChime();
      flashTitle(t("focus.alerts.breakTitle", { name: APP_NAME }));
    } else if (current === "completed") {
      if (soundEnabled) playChime();
      flashTitle(t("focus.alerts.completeTitle", { name: APP_NAME }));
    }
  }, [session, soundEnabled, t]);
}
