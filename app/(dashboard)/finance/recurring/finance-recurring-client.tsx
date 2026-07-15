"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Plus, X, Check } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { categoryDisplayName } from "@/lib/habits/describe";
import { formatCurrency, type Currency } from "@/lib/finance/format";
import {
  createRecurringTransaction,
  updateRecurringTransaction,
  setRecurringTransactionActive,
} from "@/lib/actions/finance-recurring";
import type { FinanceCategoryRow, RecurringTransactionRow } from "@/lib/queries/finance";

const TYPES = ["expense", "income"] as const;
type TxType = (typeof TYPES)[number];
const RECURRENCE_TYPES = ["monthly", "yearly"] as const;
type RecurrenceType = (typeof RECURRENCE_TYPES)[number];

type Draft = {
  type: TxType;
  categoryId: string;
  amount: string;
  note: string;
  recurrenceType: RecurrenceType;
  dayOfMonth: string;
  month: string;
  startDate: string;
};

function draftToPayload(draft: Draft) {
  return {
    type: draft.type,
    categoryId: draft.type === "expense" ? draft.categoryId : undefined,
    amount: draft.amount,
    note: draft.note || undefined,
    recurrenceType: draft.recurrenceType,
    dayOfMonth: draft.dayOfMonth,
    month: draft.recurrenceType === "yearly" ? draft.month : undefined,
    startDate: draft.startDate,
  };
}

function monthName(month: number, locale: "es" | "en"): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", { month: "long" }).format(new Date(2026, month - 1, 1));
}

/** Rules are configured occasionally, while online, from a settings-style
 * screen — unlike logging a transaction on the go, there's no offline-queue
 * requirement here, so create/edit call the server actions directly (same
 * choice already made for the gym exercise/routine catalogs). */
export function FinanceRecurringClient({
  categories,
  rules,
  currency,
  today,
}: {
  categories: FinanceCategoryRow[];
  rules: RecurringTransactionRow[];
  currency: Currency;
  today: string;
}) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState(rules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  function describeRecurrence(rule: RecurringTransactionRow): string {
    return rule.recurrenceType === "monthly"
      ? t("finance.recurring.monthlyOn", { day: rule.dayOfMonth })
      : t("finance.recurring.yearlyOn", { day: rule.dayOfMonth, month: monthName(rule.month ?? 1, locale) });
  }

  function handleToggleActive(rule: RecurringTransactionRow) {
    const active = !rule.active;
    setRows((prev) => prev.map((r) => (r.id === rule.id ? { ...r, active } : r)));
    startTransition(async () => {
      await setRecurringTransactionActive(rule.id, active);
    });
  }

  function handleCreate(draft: Draft) {
    const optimisticId = `tmp-${Date.now()}`;
    setRows((prev) => [
      ...prev,
      {
        id: optimisticId,
        userId: "",
        type: draft.type,
        categoryId: draft.type === "expense" ? draft.categoryId : null,
        amount: Number(draft.amount),
        note: draft.note || null,
        recurrenceType: draft.recurrenceType,
        dayOfMonth: Number(draft.dayOfMonth),
        month: draft.recurrenceType === "yearly" ? Number(draft.month) : null,
        startDate: draft.startDate,
        lastGeneratedDate: null,
        active: true,
        createdAt: new Date().toISOString(),
      },
    ]);
    setCreating(false);
    startTransition(async () => {
      const result = await createRecurringTransaction(draftToPayload(draft));
      if (result.error) setRows((prev) => prev.filter((r) => r.id !== optimisticId));
    });
  }

  function handleSaveEdit(id: string, draft: Draft) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              type: draft.type,
              categoryId: draft.type === "expense" ? draft.categoryId : null,
              amount: Number(draft.amount),
              note: draft.note || null,
              recurrenceType: draft.recurrenceType,
              dayOfMonth: Number(draft.dayOfMonth),
              month: draft.recurrenceType === "yearly" ? Number(draft.month) : null,
              startDate: draft.startDate,
            }
          : r
      )
    );
    setEditingId(null);
    startTransition(async () => {
      await updateRecurringTransaction(id, draftToPayload(draft));
    });
  }

  return (
    <div>
      <ContentHeader
        titleKey="finance.recurring.manage"
        subtitleKey="finance.recurring.manageSubtitle"
        backHref="/finance"
      />

      {creating ? (
        <RecurringEditor categories={categories} today={today} onSave={handleCreate} onCancel={() => setCreating(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5 text-[12px] font-medium text-muted"
        >
          <Plus size={14} strokeWidth={2} aria-hidden />
          {t("finance.recurring.addNew")}
        </button>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((rule) =>
          editingId === rule.id ? (
            <RecurringEditor
              key={rule.id}
              categories={categories}
              today={today}
              initialRule={rule}
              onSave={(draft) => handleSaveEdit(rule.id, draft)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={rule.id} className="rounded-lg border border-border p-3.5">
              <div className="flex items-center gap-2">
                <span className={cn("flex-1 truncate text-[13px] font-semibold", !rule.active && "text-muted line-through")}>
                  {rule.type === "income" ? t("finance.type.income") : categoryDisplayName(catById.get(rule.categoryId ?? ""), locale)}
                  {rule.note ? ` · ${rule.note}` : ""}
                </span>
                <span
                  className="shrink-0 text-[12.5px] font-semibold tabular-nums"
                  style={{ color: rule.type === "income" ? "var(--color-income)" : "var(--color-expense)" }}
                >
                  {rule.type === "income" ? "+" : "-"}
                  {formatCurrency(rule.amount, currency, locale)}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingId(rule.id)}
                  aria-label={t("common.edit")}
                  className="-m-2 shrink-0 rounded-full p-2 text-muted"
                >
                  <Pencil size={15} strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(rule)}
                  aria-label={rule.active ? t("finance.recurring.pause") : t("finance.recurring.resume")}
                  title={rule.active ? t("finance.recurring.pause") : t("finance.recurring.resume")}
                  className="-m-2 shrink-0 rounded-full p-2 text-muted"
                >
                  {rule.active ? <Eye size={15} strokeWidth={2} aria-hidden /> : <EyeOff size={15} strokeWidth={2} aria-hidden />}
                </button>
              </div>
              <p className="mt-1.5 text-[11.5px] text-muted">{describeRecurrence(rule)}</p>
            </div>
          )
        )}
        {rows.length === 0 && <p className="py-2 text-sm text-muted">{t("finance.recurring.empty")}</p>}
      </div>
    </div>
  );
}

function RecurringEditor({
  categories,
  today,
  initialRule,
  onSave,
  onCancel,
}: {
  categories: FinanceCategoryRow[];
  today: string;
  initialRule?: RecurringTransactionRow;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const [type, setType] = useState<TxType>((initialRule?.type as TxType) ?? "expense");
  const [categoryId, setCategoryId] = useState(initialRule?.categoryId ?? categories[0]?.id ?? "");
  const [amount, setAmount] = useState(initialRule ? String(initialRule.amount) : "");
  const [note, setNote] = useState(initialRule?.note ?? "");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>((initialRule?.recurrenceType as RecurrenceType) ?? "monthly");
  const [dayOfMonth, setDayOfMonth] = useState(initialRule ? String(initialRule.dayOfMonth) : "1");
  const [month, setMonth] = useState(initialRule?.month ? String(initialRule.month) : "1");
  const [startDate, setStartDate] = useState(initialRule?.startDate ?? today);

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthName(i + 1, locale) })),
    [locale]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    if (type === "expense" && !categoryId) return;
    onSave({ type, categoryId, amount, note, recurrenceType, dayOfMonth, month, startDate });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-3.5">
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

      <div className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          inputMode="decimal"
          min={0.01}
          step="0.01"
          placeholder={t("finance.fieldAmount")}
          className="w-0 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-[13px] outline-none focus:border-text"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder={t("finance.notePlaceholder")}
          className="w-0 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-[13px] outline-none focus:border-text"
        />
      </div>

      {type === "expense" && (
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
      )}

      <div className="flex overflow-hidden rounded-lg border border-border">
        {RECURRENCE_TYPES.map((rt) => (
          <button
            type="button"
            key={rt}
            onClick={() => setRecurrenceType(rt)}
            className="flex-1 px-1 py-2 text-[11px] font-medium"
            style={{
              background: recurrenceType === rt ? "var(--color-text)" : "transparent",
              color: recurrenceType === rt ? "var(--color-surface)" : "var(--color-muted)",
            }}
          >
            {t(`finance.recurring.${rt}`)}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {recurrenceType === "yearly" && (
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-[10px] tracking-wide text-muted uppercase">{t("finance.recurring.month")}</label>
            <Select value={month} onValueChange={setMonth} options={monthOptions} ariaLabel={t("finance.recurring.month")} />
          </div>
        )}
        <div className="flex w-20 shrink-0 flex-col gap-1">
          <label className="text-[10px] tracking-wide text-muted uppercase">{t("finance.recurring.day")}</label>
          <input
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            type="number"
            min={1}
            max={31}
            className="w-full rounded-lg border border-border bg-transparent px-2.5 py-2.5 text-sm outline-none focus:border-text"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] tracking-wide text-muted uppercase">{t("finance.recurring.startDate")}</label>
        <input
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          type="date"
          className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[13px] outline-none focus:border-text"
        />
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-text px-3.5 py-2 text-[12.5px] font-semibold text-surface">
          <Check size={14} strokeWidth={2.2} aria-hidden />
          {t("common.save")}
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[12.5px] text-muted">
          <X size={14} strokeWidth={2} aria-hidden />
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
