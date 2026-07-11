"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { CtaButton } from "@/components/landing/cta-button";
import { Reveal } from "./reveal";
import { HeatmapPreview } from "./heatmap-preview";

export function LandingHero() {
  const { t } = useI18n();

  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-5 pt-10 pb-20 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-14 md:px-10 md:pt-16 md:pb-28">
      <div className="flex flex-col items-start gap-6">
        <Reveal>
          <h1 className="max-w-[13ch] text-4xl leading-[1.08] font-semibold tracking-tight md:text-6xl">
            {t("landing.hero.headline")}
          </h1>
        </Reveal>
        <Reveal delay={90}>
          <p className="max-w-[46ch] text-base leading-relaxed text-muted md:text-lg">
            {t("landing.hero.subtitle")}
          </p>
        </Reveal>
        <Reveal delay={170}>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <CtaButton href="/signup">{t("auth.signupSubmit")}</CtaButton>
            <span className="text-[13px] text-muted">
              {t("auth.haveAccount")}{" "}
              <Link href="/login" className="font-semibold text-text underline">
                {t("auth.loginLink")}
              </Link>
            </span>
          </div>
        </Reveal>
      </div>

      <Reveal variant="scale" delay={220} className="flex flex-col gap-3">
        <div className="text-[11px] font-medium text-muted">{t("landing.heroPreview.caption")}</div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm md:p-6">
          <HeatmapPreview />
        </div>
      </Reveal>
    </section>
  );
}
