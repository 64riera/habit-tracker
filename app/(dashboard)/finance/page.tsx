import { getTransactions, getFinanceCategories, getFinanceBudgets } from "@/lib/queries/finance";
import { getCurrencyPreference } from "@/lib/queries/user";
import { getServerToday } from "@/lib/settings/date-server";
import { FinanceClient } from "./finance-client";

export default async function FinancePage() {
  const today = await getServerToday();
  const [categories, currency, budgets] = await Promise.all([
    getFinanceCategories(),
    getCurrencyPreference(),
    getFinanceBudgets(),
  ]);
  const transactions = await getTransactions(categories);

  return (
    <FinanceClient transactions={transactions} categories={categories} budgets={budgets} currency={currency} today={today} />
  );
}
