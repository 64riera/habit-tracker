"use client";

import { useActionState, useState } from "react";
import { nanoid } from "nanoid";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import type { FinanceCategoryRow, TransactionWithCategory } from "@/lib/queries/finance";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { transactionFormSchema, extractTransactionFields } from "@/lib/validation/transaction";
import { useOfflineFormAction } from "@/lib/offline/form";
import { FormAlert, StickySaveBar, Field } from "@/components/ui/form-primitives";
import { PillTabs } from "@/components/ui/pill-tabs";

const TYPES = ["expense", "income"] as const;
type TransactionType = (typeof TYPES)[number];

export function TransactionForm({
  categories,
  transaction,
  today,
}: {
  categories: FinanceCategoryRow[];
  transaction?: TransactionWithCategory;
  today: string;
}) {
  const { t, locale } = useI18n();
  const [id] = useState(() => transaction?.id ?? nanoid());
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? categories[0]?.id ?? "");

  const action = useOfflineFormAction({
    schema: transactionFormSchema,
    extractFields: extractTransactionFields,
    buildMutation: (id, values) =>
      transaction
        ? { type: "updateTransaction", transactionId: transaction.id, values }
        : { type: "createTransaction", id, values },
    onlineAction: transaction
      ? (prevState, formData) => updateTransaction(transaction.id, prevState, formData)
      : createTransaction,
  });
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="type" value={type} />
      {type === "expense" && <input type="hidden" name="categoryId" value={categoryId} />}

      <FormAlert error={state.error ? t("finance.formError") : undefined} queued={state.queued} />

      <Field label={t("finance.fieldType")}>
        <PillTabs
          options={TYPES.map((tp) => ({ value: tp, label: t(`finance.type.${tp}`) }))}
          value={type}
          onChange={setType}
          ariaLabel={t("finance.fieldType")}
        />
      </Field>

      {/* Amount + date share a row: both are short fields, so stacking them
          full-width one below the other wasted most of the row on mobile. */}
      <div className="flex gap-3">
        <Field label={t("finance.fieldAmount")} className="flex-1">
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min={0.01}
            step="0.01"
            required
            defaultValue={transaction?.amount ?? ""}
            placeholder="0.00"
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-text"
          />
        </Field>
        <Field label={t("finance.fieldDate")} className="flex-1">
          <input
            name="date"
            type="date"
            defaultValue={transaction?.date ?? today}
            required
            className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2 text-sm outline-none focus:border-text"
          />
        </Field>
      </div>

      {type === "expense" && (
        <Field label={t("finance.fieldCategory")}>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const active = categoryId === c.id;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium"
                  style={{
                    background: active ? c.color : "transparent",
                    color: active ? "var(--color-surface)" : "var(--color-muted)",
                    borderColor: active ? c.color : "var(--color-border)",
                  }}
                >
                  <span aria-hidden>{c.icon}</span>
                  {categoryDisplayName(c, locale)}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <Field label={`${t("finance.fieldNote")} (${t("common.optional")})`}>
        <input
          name="note"
          maxLength={200}
          defaultValue={transaction?.note ?? ""}
          placeholder={t("finance.notePlaceholder")}
          className="rounded-lg border border-border bg-transparent px-3.5 py-2 text-sm outline-none focus:border-text"
        />
      </Field>

      <StickySaveBar label={t("common.save")} loadingLabel={t("common.loading")} />
    </form>
  );
}
