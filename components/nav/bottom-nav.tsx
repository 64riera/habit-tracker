"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { NAV_ITEMS } from "./nav-items";
import { OfflineNavLink } from "./offline-nav-link";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    // Normal sibling of the shell (not position:fixed): by living outside
    // the scrolling <main>, it's already pinned to the bottom by the
    // flexbox layout itself, without relying on fixed/sticky over the
    // document's scroll.
    <nav className="flex shrink-0 border-t border-border bg-bg px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = item.activeWhen(pathname);
        const Icon = item.icon;
        return (
          <OfflineNavLink
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[9.5px] font-semibold transition-colors",
              active ? "text-accent" : "text-muted"
            )}
          >
            <Icon size={17} strokeWidth={2} aria-hidden />
            {t(item.dictKey)}
          </OfflineNavLink>
        );
      })}
    </nav>
  );
}
