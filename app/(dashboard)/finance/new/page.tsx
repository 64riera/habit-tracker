import { getFinanceCategories } from "@/lib/queries/finance";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { TransactionForm } from "@/components/finance/transaction-form";
import { ContentHeader } from "@/components/nav/content-header";

export default async function NuevoMovimientoPage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const categories = await getFinanceCategories();

  return (
    <div className="flex flex-1 flex-col">
      <ContentHeader titleKey="finance.newTransaction" subtitleKey="finance.newTransactionSubtitle" backHref="/finance" />
      <TransactionForm categories={categories} today={today} />
    </div>
  );
}
