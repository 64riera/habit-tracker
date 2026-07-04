import type { DayCell } from "@/lib/queries/history";

const LEVEL_ALPHA = [0, 18, 38, 62, 90];
const CELL_SIZE = 11;
const GAP = 3;

export function Heatmap({ cells }: { cells: DayCell[] }) {
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
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={cell.date}
            className="rounded-[3px]"
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              background:
                cell.level === 0
                  ? "var(--color-border)"
                  : `color-mix(in srgb, var(--color-text) ${LEVEL_ALPHA[cell.level]}%, transparent)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
