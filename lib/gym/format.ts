/** Whole-number kg with locale-appropriate thousands separators — volume
 * numbers add up fast (weight × reps × sets), so unlike individual set
 * weights (shown as typed, free text) aggregates are always rounded. */
export function formatVolume(kg: number, locale: "es" | "en"): string {
  const formatted = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(kg));
  return `${formatted} kg`;
}
