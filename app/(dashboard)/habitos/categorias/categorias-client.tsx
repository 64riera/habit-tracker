"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { useOffline } from "@/lib/offline/client";
import {
  pendingCategoryCreates,
  pendingCategoryUpdates,
  pendingCategoryDeleteIds,
  buildGhostCategory,
} from "@/lib/offline/pending-selectors";
import type { CategoryRow } from "@/lib/queries/habits";

export function CategoriasClient({ categories }: { categories: CategoryRow[] }) {
  const { t, locale } = useI18n();
  const { pendingMutations } = useOffline();

  const pendingNew = pendingCategoryCreates(pendingMutations);
  const pendingEdits = pendingCategoryUpdates(pendingMutations);
  const pendingDeleteIds = pendingCategoryDeleteIds(pendingMutations);
  const pendingIds = useMemo(
    () => new Set([...pendingNew.map((m) => m.id), ...pendingEdits.keys()]),
    [pendingNew, pendingEdits]
  );

  const displayCategories = useMemo(() => {
    const overlaid = categories
      .filter((c) => !pendingDeleteIds.has(c.id))
      .map((c) => (pendingEdits.has(c.id) ? { ...c, ...pendingEdits.get(c.id)! } : c));
    const ghosts = pendingNew.map((m) => buildGhostCategory(m.id, m.values));
    return [...overlaid, ...ghosts];
  }, [categories, pendingEdits, pendingDeleteIds, pendingNew]);

  return (
    <div>
      <ContentHeader titleKey="categories.manage" subtitleKey="categories.subtitle" />
      <div className="mb-3 flex justify-end">
        <a
          href="#crear-categoria"
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] text-muted"
        >
          <Plus size={13} strokeWidth={2} aria-hidden />
          {t("categories.newCategory")}
        </a>
      </div>
      <div className="flex flex-col gap-0.5">
        {displayCategories.map((c) => {
          const isPending = pendingIds.has(c.id);
          return (
            <Link
              key={c.id}
              href={`/habitos/categorias/${c.id}`}
              className="flex items-center gap-3 border-b border-border py-3"
              style={isPending ? { opacity: 0.6 } : undefined}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
                style={{ background: `color-mix(in oklch, ${c.color} 20%, transparent)`, color: c.color }}
              >
                {c.icon}
              </span>
              <span className="text-[13px] font-semibold">
                {categoryDisplayName(c, locale)}
                {isPending && ` · ${t("offline.pendingItem")}`}
              </span>
            </Link>
          );
        })}
        {displayCategories.length === 0 && (
          <p className="py-2 text-sm text-muted">{t("categories.empty")}</p>
        )}
      </div>
    </div>
  );
}
