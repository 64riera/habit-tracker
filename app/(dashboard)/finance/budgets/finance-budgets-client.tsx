"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { categoryDisplayName } from "@/lib/habits/describe";
import { setBudget } from "@/lib/actions/finance-budgets";
import type { FinanceBudgetRow, FinanceCategoryRow } from "@/lib/queries/finance";

/** One row per expense category (a fixed set — see canonical-categories.ts,
 * no add/hide here), each with a plain number input saved on blur rather
 * than the catalog's pencil→edit-mode→Check/X flow (see
 * gym-exercises-client.tsx): a page that's just "type a limit per row" reads
 * better as a spreadsheet-style form than ten separate edit toggles. */
export function FinanceBudgetsClient({
  categories,
  budgets,
}: {
  categories: FinanceCategoryRow[];
  budgets: FinanceBudgetRow[];
}) {
  const { locale } = useI18n();
  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b.monthlyLimit]));

  return (
    <div>
      <ContentHeader titleKey="finance.budgets.manage" subtitleKey="finance.budgets.manageSubtitle" backHref="/finance" />
      <div className="mt-4 flex flex-col gap-0.5">
        {categories.map((category) => (
          <BudgetRow
            key={category.id}
            category={category}
            initialLimit={budgetByCategory.get(category.id) ?? null}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

function BudgetRow({
  category,
  initialLimit,
  locale,
}: {
  category: FinanceCategoryRow;
  initialLimit: number | null;
  locale: "es" | "en";
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialLimit != null ? String(initialLimit) : "");
  const [committed, setCommitted] = useState(initialLimit);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  function commit() {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    const normalized = parsed !== null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    setValue(normalized != null ? String(normalized) : "");
    if (normalized === committed) return;
    setCommitted(normalized);
    startTransition(async () => {
      await setBudget(category.id, normalized);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    });
  }

  return (
    <div className="flex items-center gap-3 border-b border-border py-3">
      <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[13px]">
        <span aria-hidden>{category.icon}</span>
        {categoryDisplayName(category, locale)}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder={t("finance.budgets.noLimit")}
          aria-label={t("finance.budgets.limitLabel", { category: categoryDisplayName(category, locale) })}
          className="w-24 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-right text-[13px] tabular-nums outline-none focus:border-text"
        />
        <Check
          size={14}
          strokeWidth={2.2}
          aria-hidden
          className={cn("text-muted transition-opacity duration-300", saved ? "opacity-100" : "opacity-0")}
        />
      </div>
    </div>
  );
}
