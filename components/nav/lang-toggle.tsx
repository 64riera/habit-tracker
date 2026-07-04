"use client";

import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/dictionaries";

export function LangToggle() {
  const { locale, setLocale, isPending } = useI18n();

  const option = (value: Locale, label: string) => {
    const active = locale === value;
    return (
      <button
        type="button"
        key={value}
        disabled={isPending}
        onClick={() => setLocale(value)}
        className="rounded-full px-[9px] py-[4px] text-[10px] font-semibold transition-colors md:px-[11px] md:py-[5px] md:text-[11px]"
        style={{
          background: active ? "var(--color-accent)" : "transparent",
          color: active ? "var(--color-accent-contrast)" : "var(--color-muted)",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex gap-[2px] rounded-full bg-border p-[2px]">
      {option("es", "ES")}
      {option("en", "EN")}
    </div>
  );
}
