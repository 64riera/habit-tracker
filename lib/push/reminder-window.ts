function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Has the time for a "HH:MM" reminder already passed (or is it now), within
 * the `windowMinutes` tolerance window looking backward? The difference is
 * computed modulo 1440 (minutes in a day) so a reminder at 23:58 is still
 * detected even if `now` has already crossed midnight (00:05). Used in
 * app/api/cron/reminders/route.ts, which runs every `windowMinutes` minutes:
 * a reminder that's "due" in one run shouldn't fire again in the next, which
 * is why the window only looks backward, never forward.
 */
export function isReminderDue(reminderHHMM: string, nowHHMM: string, windowMinutes: number): boolean {
  const diff = (toMinutes(nowHHMM) - toMinutes(reminderHHMM) + 1440) % 1440;
  return diff >= 0 && diff < windowMinutes;
}
