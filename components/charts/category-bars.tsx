"use client";

export type BarItem = { key: string; label: string; value: number; color: string };

/**
 * Barras horizontales genéricas — {label, value, color} ya resueltos por el
 * caller (sin asumir un `nameEs`/`nameEn` de categoría ni que `value` venga
 * en 0–100), para poder reutilizarlas también en el desglose de enfoque por
 * hábito y por franja horaria.
 */
export function CategoryBars({
  items,
  maxValue,
  formatValue,
}: {
  items: BarItem[];
  maxValue?: number;
  formatValue: (value: number) => string;
}) {
  const max = maxValue ?? Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <div className="w-[88px] shrink-0 truncate text-xs">{item.label}</div>
          <div className="h-1.5 flex-1 rounded-full bg-border">
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${Math.min(100, (item.value / max) * 100)}%`, background: item.color }}
            />
          </div>
          <div className="w-8 shrink-0 text-right text-[11px] text-muted">{formatValue(item.value)}</div>
        </div>
      ))}
    </div>
  );
}
