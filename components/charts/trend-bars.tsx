"use client";

export type TrendBarPoint = { date: string; value: number };

/**
 * Barras de tendencia genéricas — valor crudo + `maxValue` opcional (si no
 * se pasa, se usa el máximo del propio dataset), en vez de asumir que
 * `value` ya viene en 0–100. Así sirve tanto para % de cumplimiento de
 * hábitos como para minutos de enfoque, sin clonar el componente.
 */
export function TrendBars({
  points,
  maxValue,
  formatLabel,
}: {
  points: TrendBarPoint[];
  maxValue?: number;
  formatLabel: (point: TrendBarPoint) => string;
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
                  i === points.length - 1
                    ? "var(--color-accent)"
                    : "color-mix(in srgb, var(--color-text) 22%, transparent)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
