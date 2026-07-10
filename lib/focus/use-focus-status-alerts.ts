"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/client";
import { flashTitle, playChime } from "@/lib/focus/alerts";
import type { FocusSessionRow } from "@/lib/focus/compute";
import { APP_NAME } from "@/lib/branding";

/**
 * Dispara sonido/flash de título al *entrar* a "on_break" o "completed" —
 * detecta la transición (compara contra el status anterior), no el estado
 * actual, para no repetir la alerta en cada re-render mientras el status no
 * cambia. Compartido entre `FocusTimerDisplay` y `MiniFocusIndicator`: nunca
 * están montados los dos a la vez (el indicador se oculta en /enfoque), así
 * que no hay riesgo de disparar la alerta dos veces para la misma sesión.
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
