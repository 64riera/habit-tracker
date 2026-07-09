"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "historial", href: "/historial", dictKey: "nav.historial" },
  { key: "estadisticas", href: "/estadisticas", dictKey: "nav.estadisticas" },
] as const;

/** Historial y Estadísticas viven en rutas y páginas separadas (cada una con
 * su propio data-fetching), pero comparten un solo ítem en la nav principal
 * (ver nav-items.ts) y se presentan como una misma sección mediante este
 * segmented control, al mismo estilo del selector de modo en
 * focus-start-form.tsx. */
export function HistorialTabs() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="mb-5 flex overflow-hidden rounded-lg border border-border md:w-72">
      {TABS.map((tab) => {
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
