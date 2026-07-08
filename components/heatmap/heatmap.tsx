"use client";

import { useI18n } from "@/lib/i18n/client";
import type { DayCell } from "@/lib/queries/history";

export const LEVEL_ALPHA = [0, 18, 38, 62, 90];
const CELL_SIZE = 14;
const GAP = 4;

export function Heatmap({ cells }: { cells: DayCell[] }) {
  const { t } = useI18n();
  const weeks = Math.ceil(cells.length / 7);

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${weeks}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
            gridAutoFlow: "column",
            gap: `${GAP}px`,
            width: "max-content",
          }}
        >
          {cells.map((cell) => {
            const shade = `color-mix(in srgb, var(--color-text) ${LEVEL_ALPHA[cell.level]}%, transparent)`;
            const hollow = cell.level > 0 && cell.allJustified;
            return (
              <div
                key={cell.date}
                title={cell.date}
                role="img"
                aria-label={t("history.cellLevel", { date: cell.date, level: cell.level })}
                className="rounded-[4px] box-border"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  background: cell.level === 0 ? "var(--color-border)" : hollow ? "transparent" : shade,
                  border: hollow ? `1.5px solid ${shade}` : "none",
                }}
              />
            );
          })}
        </div>
      </div>
      <HeatmapLegend />
    </div>
  );
}

function HeatmapLegend() {
  const { t } = useI18n();
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted">
      <span>{t("history.legendLess")}</span>
      <div className="flex gap-[3px]">
        {LEVEL_ALPHA.map((alpha, i) => (
          <div
            key={i}
            className="rounded-[3px]"
            style={{
              width: 10,
              height: 10,
              background: alpha === 0 ? "var(--color-border)" : `color-mix(in srgb, var(--color-text) ${alpha}%, transparent)`,
            }}
          />
        ))}
      </div>
      <span>{t("history.legendMore")}</span>
    </div>
  );
}
