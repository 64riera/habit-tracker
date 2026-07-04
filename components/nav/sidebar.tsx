"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function Sidebar({ streakMax }: { streakMax?: number | null }) {
  const pathname = usePathname();
  const { t, dict } = useI18n();

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col gap-8 border-r border-border px-6 py-8 md:flex">
      <div className="font-serif-italic text-xl font-semibold">{dict.app.name}</div>
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "border-b border-transparent py-2.5 text-sm font-medium transition-colors",
                active ? "text-accent" : "text-muted"
              )}
            >
              {t(item.dictKey)}
            </Link>
          );
        })}
      </nav>
      {streakMax != null && (
        <div className="mt-auto flex flex-col gap-2.5">
          <div className="text-[10px] tracking-wide text-muted uppercase">
            {t("streak.longest")}
          </div>
          <div className="font-serif-italic text-[26px] font-semibold">
            {streakMax}{" "}
            <span className="font-sans text-[13px] not-italic font-normal text-muted">
              {t("common.days")}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
