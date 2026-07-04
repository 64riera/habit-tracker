"use client";

import { useI18n } from "@/lib/i18n/client";
import type { DayCell } from "@/lib/queries/history";

const LEVEL_ALPHA = [0, 18, 38, 62, 90];
const CELL_SIZE = 11;
const GAP = 3;

export function Heatmap({ cells }: { cells: DayCell[] }) {
  const { t } = useI18n();
  const weeks = Math.ceil(cells.length / 7);

  return (
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
              className="rounded-[3px] box-border"
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
  );
}
