"use client";

import { useI18n } from "@/lib/i18n/client";

export function StreakProgress({ current, longest }: { current: number; longest: number }) {
  const { t } = useI18n();

  if (longest === 0 && current === 0) return null;

  const isNewRecord = current > 0 && current >= longest;
  const pct = longest > 0 ? Math.min(100, Math.round((current / longest) * 100)) : 100;
  const remaining = Math.max(0, longest - current);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[13px] font-semibold">{t("streak.current")}</div>
        <div className="font-serif-italic text-[22px] font-semibold">
          {current} <span className="font-sans text-[11px] not-italic font-normal text-muted">{t("common.days")}</span>
        </div>
      </div>
      <div className="h-1 rounded-full bg-border">
        <div
          className="h-1 rounded-full transition-all"
          style={{ width: `${pct}%`, background: "var(--color-accent)" }}
        />
      </div>
      <div className="text-[11px] text-muted">
        {isNewRecord ? t("streak.newRecord") : t("streak.toRecord", { days: remaining })}
      </div>
    </div>
  );
}
