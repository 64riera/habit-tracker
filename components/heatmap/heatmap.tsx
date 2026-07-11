"use client";

import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { DayCell } from "@/lib/queries/history";

export const LEVEL_ALPHA = [0, 18, 38, 62, 90];

/** `animateIn`: sweeps the grid in column-by-column (one week per step) on
 * mount instead of appearing flat. Off by default (the real Historial
 * screen shouldn't replay this every visit) — only the landing preview
 * opts in, as an on-load moment that shows off the actual product
 * visualization instead of a static screenshot. */
export function Heatmap({ cells, animateIn = false }: { cells: DayCell[]; animateIn?: boolean }) {
  const { t } = useI18n();
  const weeks = Math.ceil(cells.length / 7);

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      {/* .heatmap-grid (globals.css) fixes the cell size: fluid on mobile to
          use up all the available width instead of being cramped to the
          left, fixed from md up with horizontal scroll if the range doesn't
          fit (365 days). The number of columns (one per week) is only known
          at runtime, so it goes in `style`, not a Tailwind class — an
          arbitrary value with an interpolated variable can't be generated
          at build time. No fixed width/height per cell: the grid item just
          stretches to the size of its track. */}
      <div className="w-full overflow-x-auto md:w-auto">
        <div
          className="heatmap-grid grid w-full gap-1 md:w-max md:gap-1"
          style={{
            gridAutoFlow: "column",
            gridTemplateColumns: `repeat(${weeks}, var(--heatmap-col))`,
            gridTemplateRows: "repeat(7, var(--heatmap-row))",
          }}
        >
          {cells.map((cell, i) => {
            const shade = `color-mix(in srgb, var(--color-text) ${LEVEL_ALPHA[cell.level]}%, transparent)`;
            const hollow = cell.level > 0 && cell.allJustified;
            const column = Math.floor(i / 7);
            return (
              <div
                key={cell.date}
                title={cell.date}
                role="img"
                aria-label={t("history.cellLevel", { date: cell.date, level: cell.level })}
                className={cn("rounded-[4px] box-border", animateIn && "animate-heatmap-cell-in")}
                style={{
                  background: cell.level === 0 ? "var(--color-border)" : hollow ? "transparent" : shade,
                  border: hollow ? `1.5px solid ${shade}` : "none",
                  animationDelay: animateIn ? `${column * 16}ms` : undefined,
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
