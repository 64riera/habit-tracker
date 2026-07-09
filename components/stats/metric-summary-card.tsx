"use client";

export type MetricSummaryCardProps = {
  title: string;
  value: string;
  /** Delta vs. el período anterior — ya formateado por el caller (p. ej. "+12%" o "+18 min"). */
  delta?: { text: string; positive: boolean };
  secondaryStats?: { label: string; value: string }[];
};

/**
 * Tarjeta de resumen de período genérica: valor + unidad ya formateados,
 * delta opcional, hasta un par de stats secundarios. Hermana de
 * `PeriodSummaryCard` pero sin acoplarse a `PeriodSummary` (que trae campos
 * fijos de hábitos como `completed`/`missed`/`bestStreak` y un `%`
 * hardcodeado) — se creó aparte en vez de generalizar ese componente porque
 * ya está en producción y el riesgo de tocarlo no se justifica para esta
 * reutilización puntual. La usa solo Enfoque por ahora.
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
