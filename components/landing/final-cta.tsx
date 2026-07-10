"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { Reveal } from "./reveal";

export function FinalCta() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
      <Reveal className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface px-6 py-16 text-center md:py-20">
        <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight md:text-4xl">
          {t("landing.cta.title")}
        </h2>
        <p className="text-[13px] text-muted md:text-sm">{t("landing.cta.body")}</p>
        <Link
          href="/signup"
          className="mt-2 rounded-lg bg-text px-6 py-3 text-sm font-semibold text-surface transition-transform active:translate-y-px active:scale-[0.98]"
        >
          {t("auth.signupSubmit")}
        </Link>
      </Reveal>
    </section>
  );
}
