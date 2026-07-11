"use client";

import Link from "next/link";
import { History, Trees } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export function FocusSecondaryLinks() {
  const { t } = useI18n();
  return (
    <div className="mt-6 flex items-center justify-center gap-5">
      <Link href="/focus/history" className="flex items-center gap-1.5 text-[12px] text-muted">
        <History size={13} strokeWidth={2} aria-hidden />
        {t("focus.history.viewLink")}
      </Link>
      <Link href="/focus/forest" className="flex items-center gap-1.5 text-[12px] text-muted">
        <Trees size={13} strokeWidth={2} aria-hidden />
        {t("focus.rewards.viewLink")}
      </Link>
    </div>
  );
}
