"use client";

import { useEffect } from "react";
import { setTimezone } from "@/lib/actions/preferences";

/** Detecta la zona horaria IANA real del navegador y la guarda en la cuenta
 * si difiere de la que ya está guardada — necesaria para que los
 * recordatorios push sepan a qué hora UTC corresponde un horario local (ver
 * `app/api/cron/reminders/route.ts`). Sin UI, se monta una sola vez. */
export function TimezoneSync({ savedTimezone }: { savedTimezone: string | null }) {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== savedTimezone) {
      setTimezone(detected);
    }
  }, [savedTimezone]);

  return null;
}
