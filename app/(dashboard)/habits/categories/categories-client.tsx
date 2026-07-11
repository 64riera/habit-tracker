"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { useOffline } from "@/lib/offline/client";
import { cn } from "@/lib/utils";
import { PendingSyncBadge } from "@/components/offline/pending-sync-badge";
import { pendingCategoryHiddenOverrides } from "@/lib/offline/pending-selectors";
import type { CategoryRow } from "@/lib/queries/habits";

/** Categories are a fixed set (see lib/habits/canonical-categories.ts): no
 * more create/edit/delete here, only hiding the ones a user doesn't care
 * about — same optimistic-update + offline-queue pattern as pinning a
 * habit (see handleTogglePin in habits-client.tsx). */
export function CategoriasClient({ categories }: { categories: CategoryRow[] }) {
  const { t, locale } = useI18n();
  const { pendingMutations, runOrQueue } = useOffline();
  const [, startTransition] = useTransition();
  const [hiddenOverrides, setHiddenOverrides] = useState<Record<string, boolean>>({});

  const pendingHidden = pendingCategoryHiddenOverrides(pendingMutations);

  const displayCategories = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        hidden: hiddenOverrides[c.id] ?? pendingHidden.get(c.id) ?? c.hidden,
        isPending: hiddenOverrides[c.id] !== undefined || pendingHidden.has(c.id),
      })),
    [categories, hiddenOverrides, pendingHidden]
  );

  function handleToggleHidden(categoryId: string, hidden: boolean) {
    setHiddenOverrides((prev) => ({ ...prev, [categoryId]: hidden }));
    startTransition(async () => {
      await runOrQueue({ type: "setCategoryHidden", categoryId, hidden });
    });
  }

  return (
    <div>
      <ContentHeader titleKey="categories.manage" subtitleKey="categories.subtitle" backHref="/habits" />
      <div className="flex flex-col gap-0.5">
        {displayCategories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-3">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
              style={{ background: `color-mix(in oklch, ${c.color} 20%, transparent)`, color: c.color }}
            >
              {c.icon}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-semibold">
              <span className={cn("truncate", c.hidden && "text-muted line-through")}>
                {categoryDisplayName(c, locale)}
              </span>
              {c.isPending && <PendingSyncBadge />}
            </span>
            <button
              type="button"
              onClick={() => handleToggleHidden(c.id, !c.hidden)}
              aria-label={c.hidden ? t("categories.show") : t("categories.hide")}
              title={c.hidden ? t("categories.show") : t("categories.hide")}
              className="-m-2 flex shrink-0 items-center gap-1.5 p-2 text-[11px] text-muted"
            >
              {c.hidden ? <EyeOff size={15} strokeWidth={2} aria-hidden /> : <Eye size={15} strokeWidth={2} aria-hidden />}
            </button>
          </div>
        ))}
        {displayCategories.length === 0 && (
          <p className="py-2 text-sm text-muted">{t("categories.empty")}</p>
        )}
      </div>
    </div>
  );
}
