"use client";

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
      <button type="submit" className="text-[12.5px] text-muted">
        {t("common.delete")}
      </button>
    </form>
  );
}
