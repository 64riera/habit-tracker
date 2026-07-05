"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { SwipeableRow, SwipeableListProvider } from "@/components/ui/swipeable-row";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { useOffline } from "@/lib/offline/client";
import { PendingSyncBadge } from "@/components/offline/pending-sync-badge";
import {
  pendingCategoryCreates,
  pendingCategoryUpdates,
  pendingCategoryDeleteIds,
  buildGhostCategory,
} from "@/lib/offline/pending-selectors";
import type { CategoryRow } from "@/lib/queries/habits";

export function CategoriasClient({ categories }: { categories: CategoryRow[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { pendingMutations, runOrQueue } = useOffline();
  const [, startTransition] = useTransition();

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

  function handleDelete(categoryId: string) {
    if (!confirm(t("categories.confirmDelete"))) return;
    startTransition(async () => {
      await runOrQueue({ type: "deleteCategory", categoryId });
      router.refresh();
    });
  }

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
      <SwipeableListProvider>
        <div className="flex flex-col gap-0.5">
          {displayCategories.map((c) => {
            const isPending = pendingIds.has(c.id);
            return (
              <SwipeableRow
                key={c.id}
                id={c.id}
                trailingActions={[
                  {
                    key: "delete",
                    label: t("common.delete"),
                    icon: <Trash2 size={16} strokeWidth={2} aria-hidden />,
                    background: "var(--color-cat-fitness)",
                    onAction: () => handleDelete(c.id),
                  },
                ]}
              >
                <Link
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
                  <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold">
                    <span className="truncate">{categoryDisplayName(c, locale)}</span>
                    {isPending && <PendingSyncBadge />}
                  </span>
                </Link>
              </SwipeableRow>
            );
          })}
          {displayCategories.length === 0 && (
            <p className="py-2 text-sm text-muted">{t("categories.empty")}</p>
          )}
        </div>
      </SwipeableListProvider>
    </div>
  );
}
