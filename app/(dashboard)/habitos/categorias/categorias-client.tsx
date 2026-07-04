"use client";

import Link from "next/link";
import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import type { CategoryRow } from "@/lib/queries/habits";

export function CategoriasClient({ categories }: { categories: CategoryRow[] }) {
  const { t, locale } = useI18n();

  return (
    <div>
      <ContentHeader titleKey="categories.manage" subtitleKey="categories.subtitle" />
      <div className="mb-3 flex justify-end">
        <a
          href="#crear-categoria"
          className="rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] text-muted"
        >
          {t("categories.newCategory")}
        </a>
      </div>
      <div className="flex flex-col gap-0.5">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/habitos/categorias/${c.id}`}
            className="flex items-center gap-3 border-b border-border py-3"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
              style={{ background: `color-mix(in oklch, ${c.color} 20%, transparent)`, color: c.color }}
            >
              {c.icon}
            </span>
            <span className="text-[13px] font-semibold">{categoryDisplayName(c, locale)}</span>
          </Link>
        ))}
        {categories.length === 0 && (
          <p className="py-2 text-sm text-muted">{t("categories.empty")}</p>
        )}
      </div>
    </div>
  );
}
