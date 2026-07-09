"use client";

import { Flower2, Leaf, Sprout, TreeDeciduous, TreePine, Trees, type LucideIcon } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";
import { HOUR_TIERS, SESSION_COUNT_TIERS, type FocusRewardTier } from "@/lib/focus/rewards";
import type { FocusRewardProgress } from "@/lib/queries/focus";

const HOUR_TIER_ICON: Record<string, LucideIcon> = {
  seed: Sprout,
  sprout: Leaf,
  sapling: Flower2,
  young_tree: TreeDeciduous,
  mature_tree: TreePine,
};

function TierBadge({
  unlocked,
  Icon,
  label,
  requirement,
}: {
  unlocked: boolean;
  Icon: LucideIcon;
  label: string;
  requirement: string;
}) {
  return (
    <div
      className={
        unlocked
          ? "flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-center"
          : "flex flex-col items-center gap-1 rounded-xl border border-dashed px-3 py-2.5 text-center opacity-50"
      }
      style={{
        borderColor: unlocked ? "var(--color-accent)" : "var(--color-border)",
        background: unlocked ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "transparent",
        minWidth: 104,
      }}
    >
      <Icon
        size={17}
        strokeWidth={1.75}
        color={unlocked ? "var(--color-accent)" : "var(--color-muted)"}
        aria-hidden
      />
      <span
        className="text-[11.5px] font-semibold"
        style={{ color: unlocked ? "var(--color-accent)" : "var(--color-muted)" }}
      >
        {label}
      </span>
      <span className="text-[9.5px] text-muted">{requirement}</span>
    </div>
  );
}

export function BosqueClient({ progress }: { progress: FocusRewardProgress }) {
  const { t } = useI18n();
  const unlocked = new Set<FocusRewardTier>(progress.unlockedTiers);
  const totalHours = progress.totalCompletedSeconds / 3600;

  return (
    <div>
      <ContentHeader titleKey="focus.rewards.title" subtitleKey="focus.rewards.subtitle" backHref="/enfoque" />

      <div className="mb-8 flex gap-8">
        <div>
          <div className="font-serif-italic text-[28px] font-semibold tabular-nums">{totalHours.toFixed(1)}</div>
          <div className="text-[11px] text-muted">{t("focus.rewards.totalHours")}</div>
        </div>
        <div>
          <div className="font-serif-italic text-[28px] font-semibold tabular-nums">
            {progress.completedSessionCount}
          </div>
          <div className="text-[11px] text-muted">{t("focus.rewards.totalSessions")}</div>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-2 text-[10px] tracking-wide text-muted uppercase">{t("focus.rewards.treeTitle")}</div>
        <div className="flex flex-wrap gap-2">
          {HOUR_TIERS.map(({ tier, hours }) => (
            <TierBadge
              key={tier}
              unlocked={unlocked.has(tier)}
              Icon={HOUR_TIER_ICON[tier]}
              label={t(`focus.rewards.types.${tier}`)}
              requirement={t("focus.rewards.hoursRequirement", { hours })}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10px] tracking-wide text-muted uppercase">{t("focus.rewards.forestTitle")}</div>
        <div className="flex flex-wrap gap-2">
          {SESSION_COUNT_TIERS.map(({ tier, sessions }) => (
            <TierBadge
              key={tier}
              unlocked={unlocked.has(tier)}
              Icon={Trees}
              label={t(`focus.rewards.types.${tier}`)}
              requirement={t("focus.rewards.sessionsRequirement", { sessions })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
