/** mm:ss, or h:mm:ss past the hour mark — for the big clock and the break countdown. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "1h 30m" / "45m" / "2h" — for aggregated stats values, where the
 * second-level precision of `formatClock` isn't needed. The h/m
 * abbreviations are the same in Spanish and English, so there's no need to
 * translate them. */
export function formatMinutesShort(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const remainingMinutes = m % 60;
  if (h === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${h}h`;
  return `${h}h ${remainingMinutes}m`;
}
