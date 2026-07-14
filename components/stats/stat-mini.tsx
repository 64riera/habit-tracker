"use client";

/** Small bordered stat card: a label and a single serif-italic value. Used
 * wherever a screen needs a row of compact secondary stats that don't
 * warrant a full MetricSummaryCard (e.g. streaks in Focus, per-period
 * highlights in Finance). */
export function StatMini({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border p-3.5" style={{ minWidth: 150 }}>
      <div className="text-[10px] tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1.5 font-serif-italic text-base font-semibold" style={{ color: valueColor }}>
        {value}
      </div>
    </div>
  );
}
