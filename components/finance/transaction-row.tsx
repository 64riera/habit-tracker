"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { formatCurrency, type Currency } from "@/lib/finance/format";
import { PendingSyncBadge } from "@/components/offline/pending-sync-badge";
import type { TransactionWithCategory } from "@/lib/queries/finance";

export function TransactionRow({
  transaction,
  currency,
  isPendingSync,
}: {
  transaction: TransactionWithCategory;
  currency: Currency;
  isPendingSync?: boolean;
}) {
  const { t, locale } = useI18n();
  const isIncome = transaction.type === "income";
  const label = isIncome ? t("finance.type.income") : categoryDisplayName(transaction.category, locale);
  const glyph = isIncome ? "+" : (transaction.category?.icon ?? "•");
  const avatarColor = isIncome ? "var(--color-income)" : (transaction.category?.color ?? "var(--color-muted)");

  return (
    <Link href={`/finance/${transaction.id}`} className="flex items-center gap-3 border-b border-border py-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px]"
        style={{ background: `color-mix(in oklch, ${avatarColor} 16%, transparent)`, color: avatarColor }}
        aria-hidden
      >
        {glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold">
          <span className="truncate">{label}</span>
          {isPendingSync && <PendingSyncBadge />}
        </span>
        {transaction.note && <span className="mt-0.5 block truncate text-[11px] text-muted">{transaction.note}</span>}
      </span>
      <span
        className="shrink-0 text-[13.5px] font-semibold tabular-nums"
        style={{ color: isIncome ? "var(--color-income)" : "var(--color-expense)" }}
      >
        {isIncome ? "+" : "-"}
        {formatCurrency(transaction.amount, currency, locale)}
      </span>
    </Link>
  );
}
