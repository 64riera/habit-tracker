"use client";

import { Smartphone, Bell, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Reveal } from "./reveal";

const ITEMS = [
  { key: "pwa", icon: Smartphone },
  { key: "reminders", icon: Bell },
  { key: "export", icon: Download },
] as const;

export function ExtrasGrid() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24">
      <Reveal>
        <h2 className="max-w-[24ch] text-2xl font-semibold md:text-3xl">{t("landing.extras.title")}</h2>
      </Reveal>

      <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
        {ITEMS.map(({ key, icon: Icon }, i) => (
          <Reveal key={key} delay={i * 50} className="bg-bg p-6">
            <Icon size={20} strokeWidth={1.75} aria-hidden />
            <h3 className="mt-3 text-[14px] font-semibold">{t(`landing.extras.items.${key}.title`)}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              {t(`landing.extras.items.${key}.body`)}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
