"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export type SegmentedRouteTab = { key: string; href: string; dictKey: string };

/** Pairs of screens that live on separate routes (each with its own
 * data-fetching) but are presented as a single section via a segmented
 * control, in the same style as the mode selector in
 * focus-start-form.tsx. Generic: used by both Habits History/Stats and
 * Focus History/Stats. */
export function SegmentedRouteTabs({ tabs }: { tabs: readonly SegmentedRouteTab[] }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="mb-5 flex overflow-hidden rounded-lg border border-border md:w-72">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 px-1 py-2 text-center text-[12px] font-medium transition-colors",
              active ? "bg-text text-surface" : "text-muted"
            )}
          >
            {t(tab.dictKey)}
          </Link>
        );
      })}
    </div>
  );
}
