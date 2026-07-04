"use client";

import { useI18n } from "@/lib/i18n/client";
import { LangToggle } from "./lang-toggle";
import { ThemeToggle } from "./theme-toggle";

export function ContentHeader({
  titleKey,
  subtitleKey,
}: {
  titleKey: string;
  subtitleKey: string;
}) {
  const { t } = useI18n();

  return (
    <div className="mb-5 flex items-start justify-between gap-4 md:mb-[22px]">
      <div>
        <div className="font-serif-italic text-[26px] leading-tight md:text-[26px]">
          {t(titleKey)}
        </div>
        <div className="mt-1 text-[12.5px] text-muted">{t(subtitleKey)}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 md:flex-row md:items-center md:gap-3.5">
        <ThemeToggle />
        <LangToggle />
      </div>
    </div>
  );
}
