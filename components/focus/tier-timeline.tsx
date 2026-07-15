"use client";

import { useI18n } from "@/lib/i18n/client";
import { TIER_ICON } from "@/components/focus/tree-grid";
import type { FocusRewardTier } from "@/lib/focus/rewards";

export function TierTimeline({ tiers }: { tiers: { tier: FocusRewardTier; unlockedAt: string }[] }) {
  const { t, locale } = useI18n();
  if (tiers.length === 0) return null;

  const sorted = [...tiers].sort((a, b) => a.unlockedAt.localeCompare(b.unlockedAt));
  const dateFormatter = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <div className="mb-2.5 text-[10px] tracking-wide text-muted uppercase">{t("focus.rewards.timelineTitle")}</div>
      <div className="flex flex-col gap-2.5">
        {sorted.map(({ tier, unlockedAt }) => {
          const Icon = TIER_ICON[tier];
          return (
            <div key={tier} className="flex items-center gap-2.5">
              <Icon size={14} strokeWidth={1.75} color="var(--color-accent)" aria-hidden />
              <span className="text-[12.5px] font-medium">{t(`focus.rewards.types.${tier}`)}</span>
              <span className="ml-auto text-[11px] text-muted">{dateFormatter.format(new Date(unlockedAt))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
