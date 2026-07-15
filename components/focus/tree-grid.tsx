"use client";

import Link from "next/link";
import { Flower2, Leaf, Sprout, TreeDeciduous, TreePine, Trees, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { FocusRewardTier, TreeSize } from "@/lib/focus/rewards";

/** One icon per tree size, shared by the period grids (one tree per
 * session) and the Total tab's lifetime milestones (same 5-step scale,
 * different meaning) — moved here from forest-client.tsx so both places
 * draw from the same map instead of two copies drifting apart. */
export const TREE_SIZE_ICON: Record<TreeSize, LucideIcon> = {
  seed: Sprout,
  sprout: Leaf,
  sapling: Flower2,
  young_tree: TreeDeciduous,
  mature_tree: TreePine,
};

/** Covers all 9 lifetime tiers (the 5 hour-tiers above, plus the 4
 * session-count tiers, which all reuse a single `Trees` icon — matches the
 * original Total badge grid, no visual differentiation between grove sizes
 * was ever needed there). Used by the Total tab's milestone grid and by
 * TierTimeline. */
export const TIER_ICON: Record<FocusRewardTier, LucideIcon> = {
  ...TREE_SIZE_ICON,
  grove_3: Trees,
  grove_10: Trees,
  forest_25: Trees,
  forest_50: Trees,
};

/** Growth reads in the icon's own size too, not just which icon — a session
 * long enough to be a "mature_tree" should visibly take up more room than a
 * "seed" in the same grid. */
const TREE_SIZE_PX: Record<TreeSize, number> = {
  seed: 14,
  sprout: 16,
  sapling: 19,
  young_tree: 22,
  mature_tree: 26,
};

export function TreeGrid({
  trees,
  emptyTitleKey,
  emptyBodyKey,
  emptyCtaKey,
}: {
  trees: { id: string; size: TreeSize }[];
  emptyTitleKey: string;
  emptyBodyKey: string;
  emptyCtaKey: string;
}) {
  const { t } = useI18n();

  if (trees.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
        <Sprout size={22} strokeWidth={1.5} color="var(--color-muted)" aria-hidden />
        <div className="text-[13px] font-semibold">{t(emptyTitleKey)}</div>
        <div className="max-w-[220px] text-[11.5px] text-muted">{t(emptyBodyKey)}</div>
        <Link
          href="/focus"
          className="mt-1 rounded-full px-3 py-1.5 text-[11px] font-semibold"
          style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
        >
          {t(emptyCtaKey)}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2.5">
      {trees.map((tree) => {
        const Icon = TREE_SIZE_ICON[tree.size];
        return (
          <Icon
            key={tree.id}
            size={TREE_SIZE_PX[tree.size]}
            strokeWidth={1.75}
            color="var(--color-accent)"
            aria-hidden
          />
        );
      })}
    </div>
  );
}
