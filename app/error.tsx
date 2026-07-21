"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

/** Error boundary for anything below the root layout — still nested inside
 * I18nProvider/ThemeProvider (see app/layout.tsx), so it can use useI18n()
 * safely. An error at the root layout itself is caught by
 * app/global-error.tsx instead, which can't rely on those providers. Same
 * visual pattern as app/offline/page.tsx (the other full-screen fallback). */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <AlertTriangle size={28} strokeWidth={1.75} className="text-muted" aria-hidden />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[15px] font-medium text-text">{t("errorPages.errorTitle")}</h1>
        <p className="max-w-xs text-[13px] text-muted">{t("errorPages.errorBody")}</p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-text px-4 py-1.5 text-[12.5px] font-medium text-surface"
        >
          {t("errorPages.errorRetry")}
        </button>
        <Link href="/" className="rounded-full border border-border px-4 py-1.5 text-[12.5px] font-medium text-text">
          {t("errorPages.errorHome")}
        </Link>
      </div>
    </div>
  );
}
