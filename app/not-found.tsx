"use client";

import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

/** Same visual pattern as app/error.tsx / app/offline/page.tsx. Still nested
 * inside I18nProvider/ThemeProvider (see app/layout.tsx). */
export default function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <MapPinOff size={28} strokeWidth={1.75} className="text-muted" aria-hidden />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[15px] font-medium text-text">{t("errorPages.notFoundTitle")}</h1>
        <p className="max-w-xs text-[13px] text-muted">{t("errorPages.notFoundBody")}</p>
      </div>
      <Link
        href="/"
        className="mt-2 rounded-full border border-border px-4 py-1.5 text-[12.5px] font-medium text-text"
      >
        {t("errorPages.notFoundHome")}
      </Link>
    </div>
  );
}
