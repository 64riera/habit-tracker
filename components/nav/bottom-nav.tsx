"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    // Sibling normal del shell (no position:fixed): al vivir fuera del
    // <main> que scrollea, ya queda pegado abajo por el propio layout de
    // flexbox, sin depender de fixed/sticky sobre el scroll del documento.
    <nav className="flex shrink-0 border-t border-border bg-bg px-1 md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = item.activeWhen(pathname);
        const Icon = item.icon;
        return (
          <Link
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
          </Link>
        );
      })}
    </nav>
  );
}
