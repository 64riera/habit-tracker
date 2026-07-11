"use client";

import Link from "next/link";
import { Timer } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export function FocusOnHabitLink({ habitId }: { habitId: string }) {
  const { t } = useI18n();
  return (
    <Link href={`/focus?habitId=${habitId}`} className="flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] text-muted">
      <Timer size={13} strokeWidth={2} aria-hidden />
      {t("focus.startForHabit")}
    </Link>
  );
}
