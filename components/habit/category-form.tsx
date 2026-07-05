"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { nanoid } from "nanoid";
import { useI18n } from "@/lib/i18n/client";
import type { CategoryRow } from "@/lib/queries/habits";
import { createCategory, updateCategory } from "@/lib/actions/categories";
import { categorySchema, extractCategoryFields } from "@/lib/validation/category";
import { useOfflineFormAction } from "@/lib/offline/form";

const DEFAULT_COLOR = "#8a8175";

function toHex(color: string): string {
  return color.startsWith("var(") ? DEFAULT_COLOR : color;
}

export function CategoryForm({ category }: { category?: CategoryRow }) {
  const { t } = useI18n();
  const [color, setColor] = useState(category ? toHex(category.color) : DEFAULT_COLOR);
  const [id] = useState(() => category?.id ?? nanoid());
  const action = useOfflineFormAction({
    schema: categorySchema,
    extractFields: extractCategoryFields,
    buildMutation: (id, values) =>
      category
        ? { type: "updateCategory", categoryId: category.id, values }
        : { type: "createCategory", id, values },
    onlineAction: category
      ? (prevState, formData) => updateCategory(category.id, prevState, formData)
      : createCategory,
  });
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="id" value={id} />

      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-cat-fitness/40 px-3.5 py-2.5 text-[12px] text-cat-fitness"
        >
          {t("categories.formError")}
        </div>
      )}

      {state.queued && (
        <div role="status" className="rounded-lg border border-border px-3.5 py-2.5 text-[12px] text-muted">
          {t("offline.savedOffline")}
        </div>
      )}

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
      <SaveButton label={t("common.save")} loadingLabel={t("common.loading")} />
    </form>
  );
}

function SaveButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-lg bg-text px-4 py-2 text-[12.5px] font-semibold text-surface disabled:opacity-60"
    >
      {pending ? loadingLabel : label}
    </button>
  );
}
