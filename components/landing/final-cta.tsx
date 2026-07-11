"use client";

import { useI18n } from "@/lib/i18n/client";
import { CtaButton } from "@/components/landing/cta-button";
import { Reveal } from "./reveal";

export function FinalCta() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
      <Reveal
        variant="scale"
        className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface px-6 py-16 text-center md:py-20"
      >
        <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight md:text-4xl">
          {t("landing.cta.title")}
        </h2>
        <p className="text-[13px] text-muted md:text-sm">{t("landing.cta.body")}</p>
        {/* Delayed relative to the card itself: message settles first, the
            action appears right after (Section 4.5's storytelling / hierarchy
            motivation, not motion for its own sake). */}
        <Reveal delay={150} className="mt-2">
          <CtaButton href="/signup">{t("auth.signupSubmit")}</CtaButton>
        </Reveal>
      </Reveal>
    </section>
  );
}
