"use client";

import { useEffect } from "react";
import { setTimezone } from "@/lib/actions/preferences";

/** Detects the browser's actual IANA timezone and saves it to the account
 * if it differs from the one already stored — needed so push reminders know
 * which UTC time a local time corresponds to (see
 * `app/api/cron/reminders/route.ts`). No UI, mounted just once. */
export function TimezoneSync({ savedTimezone }: { savedTimezone: string | null }) {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== savedTimezone) {
      setTimezone(detected);
    }
  }, [savedTimezone]);

  return null;
}
