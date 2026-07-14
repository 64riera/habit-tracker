"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { nanoid } from "nanoid";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { categoryDisplayName } from "@/lib/habits/describe";
import type { FinanceCategoryRow, TransactionWithCategory } from "@/lib/queries/finance";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { transactionFormSchema, extractTransactionFields } from "@/lib/validation/transaction";
import { useOfflineFormAction } from "@/lib/offline/form";

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

      {state.error && (
        <div role="alert" className="rounded-lg border border-cat-fitness/40 px-3.5 py-2.5 text-[12px] text-cat-fitness">
          {t("finance.formError")}
        </div>
      )}
      {state.queued && (
        <div role="status" className="rounded-lg border border-border px-3.5 py-2.5 text-[12px] text-muted">
          {t("offline.savedOffline")}
        </div>
      )}

      <Field label={t("finance.fieldType")}>
        <div className="flex overflow-hidden rounded-lg border border-border">
          {TYPES.map((tp) => (
            <button
              type="button"
              key={tp}
              onClick={() => setType(tp)}
              className="flex-1 px-1 py-2 text-[11px] font-medium"
              style={{
                background: type === tp ? "var(--color-text)" : "transparent",
                color: type === tp ? "var(--color-surface)" : "var(--color-muted)",
              }}
            >
              {t(`finance.type.${tp}`)}
            </button>
          ))}
        </div>
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

      <SaveBar label={t("common.save")} loadingLabel={t("common.loading")} />
    </form>
  );
}

/** Sticky within <main> (the app's only scroll container, see the dashboard
 * layout): Save always sits at the bottom of the visible viewport instead of
 * wherever the last field happens to end, so reaching it never needs an
 * extra scroll no matter how long the form gets. */
function SaveBar({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 -mx-5 -mb-6 border-t border-border bg-bg/90 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+18px)] backdrop-blur-xl md:-mx-10 md:-mb-9 md:px-10">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-text px-4 py-3 text-[13px] font-semibold text-surface disabled:opacity-60 md:w-fit"
      >
        {pending ? loadingLabel : label}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="text-[10px] tracking-wide text-muted uppercase">{label}</div>
      {children}
    </div>
  );
}
