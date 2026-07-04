"use client";

import { useI18n } from "@/lib/i18n/client";
import type { CategoryStat } from "@/lib/queries/stats";

export function CategoryBars({ categories }: { categories: CategoryStat[] }) {
  const { locale } = useI18n();

  return (
    <div className="flex flex-col gap-2.5">
      {categories.map((c) => (
        <div key={c.categoryId} className="flex items-center gap-3">
          <div className="w-[88px] shrink-0 truncate text-xs">
            {locale === "es" ? c.nameEs : c.nameEn}
          </div>
          <div className="h-1.5 flex-1 rounded-full bg-border">
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${c.pct}%`, background: c.color }}
            />
          </div>
          <div className="w-8 shrink-0 text-right text-[11px] text-muted">{c.pct}%</div>
        </div>
      ))}
    </div>
  );
}
