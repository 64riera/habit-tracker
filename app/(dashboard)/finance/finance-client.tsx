"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { SwipeableRow, SwipeableListProvider } from "@/components/ui/swipeable-row";
import { PeriodSelector } from "@/components/finance/period-selector";
import { PeriodSummary } from "@/components/finance/period-summary";
import { CategoryBreakdown } from "@/components/finance/category-breakdown";
import { TrendChart } from "@/components/finance/trend-chart";
import { TransactionRow } from "@/components/finance/transaction-row";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import {
  pendingTransactionCreates,
  pendingTransactionUpdates,
  pendingTransactionDeleteIds,
  buildGhostTransaction,
  applyPendingTransactionEdit,
} from "@/lib/offline/pending-selectors";
import { addDays, groupByDate, parseISODate } from "@/lib/date";
import {
  periodRange,
  filterByRange,
  summarizeTransactions,
  bucketTransactions,
  bucketForPeriod,
  type Period,
} from "@/lib/finance/aggregate";
import type { FinanceCategoryRow, TransactionWithCategory } from "@/lib/queries/finance";
import type { Currency } from "@/lib/finance/format";

export function FinanceClient({
  transactions,
  categories,
  currency,
  today,
}: {
  transactions: TransactionWithCategory[];
  categories: FinanceCategoryRow[];
  currency: Currency;
  today: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { pendingMutations, runOrQueue } = useOffline();
  const [, startTransition] = useTransition();

  const yesterday = addDays(today, -1);
  const dayHeaderFormatter = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  function formatDayHeader(date: string) {
    if (date === today) return t("checkin.today");
    if (date === yesterday) return t("history.yesterday");
    return dayHeaderFormatter.format(parseISODate(date));
  }

  const [period, setPeriod] = useState<Period>("month");
  const [customRange, setCustomRange] = useState({ from: today, to: today });

  const pendingNew = pendingTransactionCreates(pendingMutations);
  const pendingEdits = pendingTransactionUpdates(pendingMutations);
  const pendingDeleteIds = pendingTransactionDeleteIds(pendingMutations);
  const pendingIds = useMemo(
    () => new Set([...pendingNew.map((m) => m.id), ...pendingEdits.keys()]),
    [pendingNew, pendingEdits]
  );

  const allTransactions = useMemo(() => {
    const overlaid = transactions
      .filter((tx) => !pendingDeleteIds.has(tx.id))
      .map((tx) => (pendingEdits.has(tx.id) ? applyPendingTransactionEdit(tx, pendingEdits.get(tx.id)!, categories) : tx));
    const ghosts = pendingNew.map((m) => buildGhostTransaction(m.id, m.values, categories));
    return [...overlaid, ...ghosts].sort((a, b) => (a.date === b.date ? 0 : b.date.localeCompare(a.date)));
  }, [transactions, pendingEdits, pendingDeleteIds, pendingNew, categories]);

  const { from, to } = periodRange(period, today, customRange);
  const inRange = useMemo(() => filterByRange(allTransactions, from, to), [allTransactions, from, to]);
  const totals = useMemo(() => summarizeTransactions(inRange), [inRange]);
  const buckets = useMemo(() => bucketTransactions(inRange, bucketForPeriod(period)), [inRange, period]);
  const groups = useMemo(() => groupByDate(inRange), [inRange]);

  function handleDelete(transactionId: string) {
    if (!confirm(t("finance.confirmDelete"))) return;
    startTransition(async () => {
      await runOrQueue({ type: "deleteTransaction", transactionId });
      router.refresh();
    });
  }

  return (
    <div>
      <ContentHeader titleKey="screens.finance.title" subtitleKey="screens.finance.subtitle" />

      <div className="mb-5">
        <PeriodSelector
          period={period}
          onPeriodChange={setPeriod}
          customFrom={customRange.from}
          customTo={customRange.to}
          onCustomChange={(from, to) => setCustomRange({ from, to })}
        />
      </div>

      <div className="mb-6">
        <PeriodSummary totals={totals} currency={currency} />
      </div>

      {totals.byCategory.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
            {t("finance.byCategory")}
          </h2>
          <CategoryBreakdown byCategory={totals.byCategory} categories={categories} currency={currency} />
        </div>
      )}

      {buckets.length > 1 && (
        <div className="mb-6">
          <h2 className="mb-2.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
            {t("finance.trend")}
          </h2>
          <TrendChart buckets={buckets} currency={currency} />
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t("finance.movements")}</h2>
        <a
          href="#nuevo-movimiento"
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] text-muted"
        >
          <Plus size={13} strokeWidth={2} aria-hidden />
          {t("finance.newTransaction")}
        </a>
      </div>

      <SwipeableListProvider>
        <div className="flex flex-col gap-0.5">
          {groups.map((group) => (
            <div key={group.date}>
              <div className="pt-3 pb-1 font-serif-italic text-[15px] leading-tight">{formatDayHeader(group.date)}</div>
              {group.items.map((tx) => (
                <SwipeableRow
                  key={tx.id}
                  id={tx.id}
                  trailingActions={[
                    {
                      key: "delete",
                      label: t("common.delete"),
                      icon: <Trash2 size={16} strokeWidth={2} aria-hidden />,
                      background: "var(--color-cat-fitness)",
                      onAction: () => handleDelete(tx.id),
                    },
                  ]}
                >
                  <TransactionRow transaction={tx} currency={currency} isPendingSync={pendingIds.has(tx.id)} />
                </SwipeableRow>
              ))}
            </div>
          ))}
          {groups.length === 0 && <p className="py-2 text-sm text-muted">{t("finance.empty")}</p>}
        </div>
      </SwipeableListProvider>
    </div>
  );
}
