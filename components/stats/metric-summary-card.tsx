"use client";

export type MetricSummaryCardProps = {
  title: string;
  value: string;
  /** Delta vs. the previous period — already formatted by the caller (e.g. "+12%" or "+18 min"). */
  delta?: { text: string; positive: boolean };
  secondaryStats?: { label: string; value: string }[];
};

/**
 * Generic period summary card: value + unit already formatted, optional
 * delta, up to a couple of secondary stats. Sibling of `PeriodSummaryCard`
 * but without coupling to `PeriodSummary` (which brings fixed habit fields
 * like `completed`/`missed`/`bestStreak` and a hardcoded `%`) — it was
 * created separately instead of generalizing that component because it's
 * already in production and the risk of touching it isn't justified for
 * this one-off reuse. Only Focus uses it for now.
 */
export function MetricSummaryCard({ title, value, delta, secondaryStats }: MetricSummaryCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[13px] font-semibold">{title}</div>
        {delta && (
          <div
            className="text-[11px] font-medium"
            style={{ color: delta.positive ? "var(--color-accent)" : "var(--color-muted)" }}
          >
            {delta.text}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-3.5">
        <div className="font-serif-italic text-[26px] font-semibold">{value}</div>
      </div>

      {secondaryStats && secondaryStats.length > 0 && (
        <div className="flex gap-5 text-[11.5px] text-muted">
          {secondaryStats.map((s) => (
            <span key={s.label}>
              {s.label} <span className="font-semibold text-text">{s.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
