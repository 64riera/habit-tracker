import { addDays } from "@/lib/date";

/** Tope defensivo para el recorrido hacia atrás — evita un loop infinito si
 * `goalMinutes` fuera 0 o negativo (nunca debería pasar, `dailyGoalMinutes`
 * tiene un mínimo mayor a 0 en el formulario de ajustes de enfoque). */
const MAX_LOOKBACK_DAYS = 3650;

/**
 * Racha de días consecutivos cumpliendo el objetivo diario de enfoque, pura
 * (sin I/O): `dailyMinutesByDate` solo necesita traer los días con al menos
 * una sesión *completada* (canceladas y la sesión en curso no cuentan, ver
 * decisión de producto en el historial de enfoque) — un día ausente del mapa
 * se trata igual que un día con 0 minutos.
 *
 * `today` no cuenta como corte de racha si todavía no alcanzó el objetivo:
 * el día sigue en curso (según el cutoff de día ya aplicado por el caller),
 * así que la racha actual arranca en ayer si hoy aún no cumple.
 */
export function computeFocusStreak(
  dailyMinutesByDate: Map<string, number>,
  goalMinutes: number,
  today: string
): { current: number; longest: number } {
  const meets = (date: string) => (dailyMinutesByDate.get(date) ?? 0) >= goalMinutes;

  let current = 0;
  let cursor = meets(today) ? today : addDays(today, -1);
  for (let step = 0; step < MAX_LOOKBACK_DAYS && meets(cursor); step++) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const dates = [...dailyMinutesByDate.keys()].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    if (!meets(date)) {
      run = 0;
      continue;
    }
    run = i > 0 && addDays(dates[i - 1], 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  return { current, longest: Math.max(longest, current) };
}
