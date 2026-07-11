/** Fecha efectiva "de hoy" en formato YYYY-MM-DD, respetando la hora de corte del día. */
export function getTodayDateString(cutoffHour: number = 3, now: Date = new Date()): string {
  const effective = new Date(now);
  if (now.getHours() < cutoffHour) {
    effective.setDate(effective.getDate() - 1);
  }
  return toISODate(effective);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(value: string, amount: number): string {
  const date = parseISODate(value);
  date.setDate(date.getDate() + amount);
  return toISODate(date);
}

/** Día de la semana en formato lunes=1 ... domingo=7 */
export function isoWeekday(value: string): number {
  const jsDay = parseISODate(value).getDay(); // 0=domingo..6=sábado
  return jsDay === 0 ? 7 : jsDay;
}

export function daysBetween(from: string, to: string): number {
  const a = parseISODate(from).getTime();
  const b = parseISODate(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Genera un rango inclusivo de fechas YYYY-MM-DD */
export function dateRange(from: string, to: string): string[] {
  const n = daysBetween(from, to);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

export function startOfWeek(value: string): string {
  const wd = isoWeekday(value);
  return addDays(value, -(wd - 1));
}

export function startOfMonth(value: string): string {
  const d = parseISODate(value);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function monthKey(value: string): string {
  return value.slice(0, 7); // YYYY-MM
}

/** Hora del día en formato 12h con am/pm — la app entera usa 12h para
 * cualquier hora mostrada al usuario, sin importar el idioma (a diferencia
 * de es-ES, cuyo default de Intl es 24h).
 *
 * El `.replace(/\s+/g, " ")` no es cosmético: el ICU de Node (SSR) y el
 * del navegador (hidratación) no siempre coinciden en qué caracter de
 * espacio meten dentro de "p. m." en es-ES (uno usa un espacio normal,
 * otro un NBSP/narrow-NBSP) — mismo texto visible, bytes distintos, y
 * React lo trata como mismatch de hidratación. Normalizar todo espacio a
 * uno común deja el string byte-idéntico en ambos lados. */
export function formatTimeOfDay(date: Date, locale: "es" | "en"): string {
  const formatted = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return formatted.replace(/\s+/g, " ");
}

/** Agrupa una lista ya ordenada por fecha desc en bloques por día consecutivos. */
export function groupByDate<T extends { date: string }>(entries: T[]): { date: string; items: T[] }[] {
  const groups: { date: string; items: T[] }[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === entry.date) last.items.push(entry);
    else groups.push({ date: entry.date, items: [entry] });
  }
  return groups;
}
