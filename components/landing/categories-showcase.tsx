"use client";

import { useI18n } from "@/lib/i18n/client";
import { Reveal } from "./reveal";

const CATEGORY_KEYS = ["creatividad", "fitness", "aprendizaje", "estudio", "bienestar"] as const;
const CATEGORY_ICONS: Record<(typeof CATEGORY_KEYS)[number], string> = {
  creatividad: "🎨",
  fitness: "💪",
  aprendizaje: "🧠",
  estudio: "📚",
  bienestar: "🧘",
};

export function CategoriesShowcase() {
  const { t } = useI18n();

  // Lighter on mobile (py-12) than the other sections: it's just a wrapped
  // chip row, so the standard py-16 rhythm read as an oversized gap next to
  // its light content once the next section started. md:py-24 unchanged,
  // that's fine at desktop width.
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 md:px-10 md:py-24">
      <Reveal className="flex flex-col items-start gap-2">
        <h2 className="text-2xl font-semibold md:text-3xl">{t("landing.categories.title")}</h2>
        <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted md:text-sm">
          {t("landing.categories.body")}
        </p>
      </Reveal>

      <div className="mt-8 flex flex-wrap gap-3">
        {CATEGORY_KEYS.map((key, i) => (
          <Reveal key={key} variant="pop" delay={i * 60}>
            <div
              className="flex items-center gap-2.5 rounded-full border border-border px-4 py-2.5"
              style={{ background: `color-mix(in srgb, var(--cat-${key}) 10%, var(--color-surface))` }}
            >
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(--cat-${key})` }} />
              <span aria-hidden className="text-sm leading-none">
                {CATEGORY_ICONS[key]}
              </span>
              <span className="text-[13px] font-medium">{t(`categories.${key}`)}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
