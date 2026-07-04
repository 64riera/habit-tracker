"use client";

import { useI18n } from "@/lib/i18n/client";
import type { CalendarCell } from "@/lib/queries/history";

const LEVEL_ALPHA = [0, 18, 38, 62, 90];
const WEEKDAY_KEYS = [1, 2, 3, 4, 5, 6, 7];

export function CalendarMonth({ cells, monthLabel }: { cells: CalendarCell[]; monthLabel: string }) {
  const { t } = useI18n();

  return (
    <div>
      <div className="mb-2 text-[10px] tracking-wide text-muted uppercase">{monthLabel}</div>
      <div
        className="grid w-fit gap-[5px]"
        style={{ gridTemplateColumns: "repeat(7, 32px)" }}
      >
        {WEEKDAY_KEYS.map((d) => (
          <div key={d} className="text-center text-[9px] font-semibold text-muted">
            {t(`habit.weekdayShort.${d}`)}
          </div>
        ))}
        {cells.map((cell) => {
          const isFilled = cell.level > 0;
          return (
            <div
              key={cell.date}
              className="flex aspect-square items-center justify-center rounded-lg border text-[11px] box-border"
              style={{
                background: cell.isToday
                  ? "var(--color-accent)"
                  : isFilled
                    ? `color-mix(in srgb, var(--color-text) ${LEVEL_ALPHA[cell.level]}%, transparent)`
                    : "transparent",
                borderColor: cell.isToday ? "var(--color-accent)" : "var(--color-border)",
                color: cell.isToday
                  ? "var(--color-accent-contrast)"
                  : cell.level >= 3
                    ? "var(--color-accent-contrast)"
                    : "var(--color-muted)",
                opacity: cell.inMonth ? 1 : 0.25,
              }}
            >
              {Number(cell.date.slice(-2))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
