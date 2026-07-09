/** mm:ss, o h:mm:ss pasada la hora — para el reloj grande y la cuenta de la pausa. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "1h 30m" / "45m" / "2h" — para valores agregados de estadísticas, donde
 * no hace falta la precisión de segundos de `formatClock`. Las abreviaturas
 * h/m son iguales en español e inglés, así que no hace falta traducirlas. */
export function formatMinutesShort(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const remainingMinutes = m % 60;
  if (h === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${h}h`;
  return `${h}h ${remainingMinutes}m`;
}
