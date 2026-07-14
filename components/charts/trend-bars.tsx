"use client";

export type TrendBarPoint = { date: string; value: number };

/**
 * Generic trend bars — raw value + optional `maxValue` (if not passed, the
 * dataset's own max is used), instead of assuming `value` already comes in
 * 0–100. This way it works both for habit completion % and for focus
 * minutes, without cloning the component.
 */
export function TrendBars({
  points,
  maxValue,
  formatLabel,
  highlightColor = "var(--color-accent)",
}: {
  points: TrendBarPoint[];
  maxValue?: number;
  formatLabel: (point: TrendBarPoint) => string;
  /** Color of the most recent (rightmost) bar — defaults to the app-wide
   * accent, but a section with its own identity color (e.g. Gym's
   * --color-cat-fitness) can tie the chart back to it instead. */
  highlightColor?: string;
}) {
  const max = maxValue ?? Math.max(1, ...points.map((p) => p.value));

  return (
    <div className="overflow-x-auto">
      <div className="flex h-16 items-end gap-1.5">
        {points.map((p, i) => {
          const heightPct = Math.min(100, (p.value / max) * 100);
          return (
            <div
              key={p.date}
              role="img"
              aria-label={formatLabel(p)}
              title={formatLabel(p)}
              className="w-3.5 shrink-0 rounded-t-[3px]"
              style={{
                height: `${Math.max(heightPct, 2)}%`,
                background:
                  i === points.length - 1 ? highlightColor : "color-mix(in srgb, var(--color-text) 22%, transparent)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
