"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export type SegmentedRouteTab = { key: string; href: string; dictKey: string };

/** Pares de pantallas que viven en rutas separadas (cada una con su propio
 * data-fetching) pero se presentan como una misma sección mediante un
 * segmented control, al mismo estilo del selector de modo en
 * focus-start-form.tsx. Genérico: lo usan tanto Historial/Estadísticas de
 * hábitos como Historial/Estadísticas de enfoque. */
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
