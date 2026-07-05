"use client";

import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { deleteCategory } from "@/lib/actions/categories";
import { useOfflineIdAction } from "@/lib/offline/form";

export function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
  const { t } = useI18n();
  const action = useOfflineIdAction({
    onlineAction: () => deleteCategory(categoryId),
    buildMutation: () => ({ type: "deleteCategory", categoryId }),
  });
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(t("categories.confirmDelete"))) e.preventDefault();
      }}
    >
      <button type="submit" className="flex items-center gap-1.5 text-[12.5px] text-muted">
        <Trash2 size={13} strokeWidth={2} aria-hidden />
        {t("common.delete")}
      </button>
    </form>
  );
}
