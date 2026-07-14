import { getTransactions, getFinanceCategories } from "@/lib/queries/finance";
import { getCurrencyPreference } from "@/lib/queries/user";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { TransactionForm } from "@/components/finance/transaction-form";
import { FinanceClient } from "./finance-client";

export default async function FinancePage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const [transactions, categories, currency] = await Promise.all([
    getTransactions(),
    getFinanceCategories(),
    getCurrencyPreference(),
  ]);

  return (
    <div>
      <FinanceClient transactions={transactions} categories={categories} currency={currency} today={today} />
      <div id="nuevo-movimiento" className="mt-6 scroll-mt-6 border-t border-border pt-5">
        <TransactionForm categories={categories} today={today} />
      </div>
    </div>
  );
}
