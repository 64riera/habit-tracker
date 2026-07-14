import { getFinanceCategories } from "@/lib/queries/finance";
import { getServerToday } from "@/lib/settings/date-server";
import { TransactionForm } from "@/components/finance/transaction-form";
import { ContentHeader } from "@/components/nav/content-header";

export default async function NuevoMovimientoPage() {
  const today = await getServerToday();
  const categories = await getFinanceCategories();

  return (
    <div className="flex flex-1 flex-col">
      <ContentHeader titleKey="finance.newTransaction" subtitleKey="finance.newTransactionSubtitle" backHref="/finance" />
      <TransactionForm categories={categories} today={today} />
    </div>
  );
}
