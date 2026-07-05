"use client";

import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export function DeleteCategoryButton({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const { t } = useI18n();
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
