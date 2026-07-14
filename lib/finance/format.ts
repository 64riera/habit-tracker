export type Currency = "MXN" | "USD";

/** Same reasoning as formatTimeOfDay (lib/date.ts): normalizes whichever
 * space character Intl picks (regular vs. NBSP) so SSR and hydration agree
 * on the exact bytes, not just the visible text. */
export function formatCurrency(amount: number, currency: Currency, locale: "es" | "en"): string {
  const formatted = new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
  return formatted.replace(/\s+/g, " ");
}
