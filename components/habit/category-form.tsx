"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { nanoid } from "nanoid";
import { useI18n } from "@/lib/i18n/client";
import type { CategoryRow } from "@/lib/queries/habits";
import { createCategory, updateCategory } from "@/lib/actions/categories";
import { categorySchema, extractCategoryFields } from "@/lib/validation/category";
import { useOfflineFormAction } from "@/lib/offline/form";

const DEFAULT_COLOR = "#8a8175";

/**
 * Las categorías por defecto guardan su color como `var(--cat-x)` (OKLCH vía
 * custom property), que un <input type="color"> nativo no puede mostrar.
 * Se resuelve al hex real dejando que el propio motor del navegador convierta
 * el OKLCH a rgb() en un elemento sonda, en vez de caer a un color inventado
 * que se guardaría por error si el usuario no toca el picker.
 */
function resolveCssVarToHex(varExpr: string): string {
  const match = /var\((--[\w-]+)\)/.exec(varExpr);
  if (!match) return DEFAULT_COLOR;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim();
  if (!raw) return DEFAULT_COLOR;
  // Las categorías usan OKLCH, que el navegador puede resolver a lab() u otro
  // espacio de color amplio (no siempre rgb()) al leer un computed style. Un
  // canvas 1x1 rasteriza cualquier color CSS válido a píxeles sRGB reales,
  // sin necesidad de parsear la sintaxis de la función de color de origen.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return DEFAULT_COLOR;
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}

export function CategoryForm({ category }: { category?: CategoryRow }) {
  const { t } = useI18n();
  const [color, setColor] = useState(
    category && !category.color.startsWith("var(") ? category.color : DEFAULT_COLOR
  );

  useEffect(() => {
    // React no re-sincroniza el `value` de un <input> controlado durante la
    // hidratación aunque el estado inicial del cliente difiera del SSR, así
    // que la corrección real solo se refleja en el DOM si llega vía un
    // set-state posterior al montaje, no desde el propio inicializador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (category?.color.startsWith("var(")) setColor(resolveCssVarToHex(category.color));
  }, [category?.color]);

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
