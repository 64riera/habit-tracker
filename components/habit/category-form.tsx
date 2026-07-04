"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { CategoryRow } from "@/lib/queries/habits";

const DEFAULT_COLOR = "#8a8175";

function toHex(color: string): string {
  return color.startsWith("var(") ? DEFAULT_COLOR : color;
}

export function CategoryForm({
  action,
  category,
}: {
  action: (formData: FormData) => void | Promise<void>;
  category?: CategoryRow;
}) {
  const { t } = useI18n();
  const [color, setColor] = useState(category ? toHex(category.color) : DEFAULT_COLOR);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="text-[10px] tracking-wide text-muted uppercase">
            {t("categories.fieldNameEs")}
          </div>
          <input
            name="nameEs"
            required
            maxLength={40}
            defaultValue={category?.nameEs ?? ""}
            className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-text"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="text-[10px] tracking-wide text-muted uppercase">
            {t("categories.fieldNameEn")}
          </div>
          <input
            name="nameEn"
            required
            maxLength={40}
            defaultValue={category?.nameEn ?? ""}
            className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-text"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] tracking-wide text-muted uppercase">
            {t("categories.fieldColor")}
          </div>
          <input
            type="color"
            name="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 rounded-lg border border-border bg-transparent"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="text-[10px] tracking-wide text-muted uppercase">
            {t("categories.fieldIcon")}
          </div>
          <input
            name="icon"
            maxLength={4}
            defaultValue={category?.icon ?? ""}
            placeholder="●"
            className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-text"
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-fit rounded-lg bg-text px-4 py-2 text-[12.5px] font-semibold text-surface"
      >
        {t("common.save")}
      </button>
    </form>
  );
}
