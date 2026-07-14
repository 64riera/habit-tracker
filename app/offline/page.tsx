"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

// Served by the service worker (see public/sw.js) as the navigation
// fallback for any route that isn't in PAGES_CACHE — i.e. a section that
// was never visited on this device. Deliberately static: no cookies()/DB
// reads, so it can be fetched and cached once at SW `install` time and
// still render correctly however stale that cached copy gets.
export default function OfflinePage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <WifiOff size={28} strokeWidth={1.75} className="text-muted" aria-hidden />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[15px] font-medium text-text">{t("offline.fallbackTitle")}</h1>
        <p className="max-w-xs text-[13px] text-muted">{t("offline.fallbackBody")}</p>
      </div>
      <Link
        href="/"
        className="mt-2 rounded-full border border-border px-4 py-1.5 text-[12.5px] font-medium text-text"
      >
        {t("offline.fallbackCta")}
      </Link>
    </div>
  );
}
