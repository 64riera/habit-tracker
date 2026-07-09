"use client";

import Link from "next/link";
import { Timer } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export function FocusCtaCard() {
  const { t } = useI18n();
  return (
    <Link
      href="/enfoque"
      className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-left"
    >
      <Timer size={18} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
      <div className="flex flex-col">
        <span className="text-[12.5px] font-medium">{t("focus.cta")}</span>
        <span className="text-[11px] text-muted">{t("focus.ctaSubtitle")}</span>
      </div>
    </Link>
  );
}
