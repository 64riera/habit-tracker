/** % change from `base` to `compared` — null when base is 0, since a ratio
 * against zero (e.g. $0 average spend, 0 minutes last period) isn't a
 * meaningful percentage. Shared by any "vs. previous period/bucket" card. */
export function percentDelta(base: number, compared: number): number | null {
  if (base === 0) return null;
  return Math.round(((compared - base) / base) * 100);
}

export function formatDeltaValue(pct: number): string {
  return `${pct > 0 ? "+" : ""}${pct}%`;
}
