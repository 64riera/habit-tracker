import { notFound } from "next/navigation";
import { getTransactions, getFinanceCategories } from "@/lib/queries/finance";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { TransactionForm } from "@/components/finance/transaction-form";
import { ContentHeader } from "@/components/nav/content-header";
import { DeleteTransactionButton } from "./delete-transaction-button";

export default async function MovimientoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const [transactions, categories] = await Promise.all([getTransactions(), getFinanceCategories()]);
  const transaction = transactions.find((tx) => tx.id === id);
  if (!transaction) notFound();

  return (
    <div>
      <ContentHeader titleKey="screens.finance.title" subtitleKey="screens.finance.subtitle" backHref="/finance" />
      <TransactionForm categories={categories} transaction={transaction} today={today} />
      <div className="mt-3">
        <DeleteTransactionButton transactionId={id} />
      </div>
    </div>
  );
}
