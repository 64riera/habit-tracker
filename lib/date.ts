/** Effective "today" date in YYYY-MM-DD format, respecting the day's cutoff hour. */
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

/** Day of the week in Monday=1 ... Sunday=7 format */
export function isoWeekday(value: string): number {
  const jsDay = parseISODate(value).getDay(); // 0=Sunday..6=Saturday
  return jsDay === 0 ? 7 : jsDay;
}

export function daysBetween(from: string, to: string): number {
  const a = parseISODate(from).getTime();
  const b = parseISODate(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Generates an inclusive range of YYYY-MM-DD dates */
export function dateRange(from: string, to: string): string[] {
  const n = daysBetween(from, to);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

export function startOfWeek(value: string): string {
  const wd = isoWeekday(value);
  return addDays(value, -(wd - 1));
}

export function endOfWeek(value: string): string {
  return addDays(startOfWeek(value), 6);
}

export function startOfMonth(value: string): string {
  const d = parseISODate(value);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(value: string): string {
  const d = parseISODate(value);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function startOfYear(value: string): string {
  const d = parseISODate(value);
  return toISODate(new Date(d.getFullYear(), 0, 1));
}

export function endOfYear(value: string): string {
  const d = parseISODate(value);
  return toISODate(new Date(d.getFullYear(), 11, 31));
}

export function monthKey(value: string): string {
  return value.slice(0, 7); // YYYY-MM
}

export function yearKey(value: string): string {
  return value.slice(0, 4); // YYYY
}

/** Time of day in 12h format with am/pm — the whole app uses 12h for any
 * time shown to the user, regardless of language (unlike es-ES, whose
 * Intl default is 24h).
 *
 * The `.replace(/\s+/g, " ")` isn't cosmetic: Node's ICU (SSR) and the
 * browser's (hydration) don't always agree on which space character they
 * put inside "p. m." in es-ES (one uses a regular space, the other an
 * NBSP/narrow-NBSP) — same visible text, different bytes, and React
 * treats it as a hydration mismatch. Normalizing every space to a common
 * one leaves the string byte-identical on both sides. */
export function formatTimeOfDay(date: Date, locale: "es" | "en"): string {
  const formatted = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return formatted.replace(/\s+/g, " ");
}

/** Groups a list already sorted by date desc into blocks of consecutive days. */
export function groupByDate<T extends { date: string }>(entries: T[]): { date: string; items: T[] }[] {
  const groups: { date: string; items: T[] }[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === entry.date) last.items.push(entry);
    else groups.push({ date: entry.date, items: [entry] });
  }
  return groups;
}
