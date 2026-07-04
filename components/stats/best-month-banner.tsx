"use client";

import { useI18n } from "@/lib/i18n/client";
import { parseISODate } from "@/lib/date";
import type { BestMonthCheck } from "@/lib/queries/summary";

export function BestMonthBanner({ check }: { check: BestMonthCheck }) {
  const { t, locale } = useI18n();

  if (!check || !check.isBestSoFar) return null;

  const monthName = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
  }).format(parseISODate(check.monthStart));

  return (
    <div
      className="rounded-xl border px-3.5 py-2.5 text-[12px]"
      style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
    >
      {t("stats.bestMonthSoFar", { month: monthName })}
    </div>
  );
}
