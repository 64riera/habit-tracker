"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import type { CalendarCell } from "@/lib/queries/history";

const LEVEL_ALPHA = [0, 18, 38, 62, 90];
const WEEKDAY_KEYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * `today` habilita cada día pasado (o de hoy) del mes como un link directo a
 * Hoy con esa fecha (`/?fecha=...`) — es la entrada natural para registrar o
 * corregir un hábito de un día específico, sin agregar una pantalla nueva.
 * Días futuros o fuera del mes se quedan como celdas planas.
 */
export function CalendarMonth({
  cells,
  monthLabel,
  today,
}: {
  cells: CalendarCell[];
  monthLabel: string;
  today: string;
}) {
  const { t } = useI18n();

  return (
    <div>
      <div className="mb-2 text-[10px] tracking-wide text-muted uppercase">{monthLabel}</div>
      <div className="overflow-x-auto">
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
            const hollow = isFilled && cell.allJustified;
            const shade = `color-mix(in srgb, var(--color-text) ${LEVEL_ALPHA[cell.level]}%, transparent)`;
            const clickable = cell.inMonth && cell.date <= today;
            const style = {
              background: cell.isToday ? "var(--color-accent)" : isFilled && !hollow ? shade : "transparent",
              borderColor: cell.isToday ? "var(--color-accent)" : hollow ? shade : "var(--color-border)",
              borderWidth: hollow ? "1.5px" : "1px",
              color: cell.isToday
                ? "var(--color-accent-contrast)"
                : cell.level >= 3 && !hollow
                  ? "var(--color-accent-contrast)"
                  : "var(--color-muted)",
              opacity: cell.inMonth ? 1 : 0.25,
            };
            const className =
              "flex aspect-square items-center justify-center rounded-lg border text-[11px] box-border" +
              (clickable ? " transition-[filter] hover:brightness-90" : "");

            return clickable ? (
              <Link
                key={cell.date}
                href={`/?fecha=${cell.date}`}
                aria-label={t("history.editDay", { date: cell.date })}
                className={className}
                style={style}
              >
                {Number(cell.date.slice(-2))}
              </Link>
            ) : (
              <div
                key={cell.date}
                role="img"
                aria-label={t("history.cellLevel", { date: cell.date, level: cell.level })}
                className={className}
                style={style}
              >
                {Number(cell.date.slice(-2))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
