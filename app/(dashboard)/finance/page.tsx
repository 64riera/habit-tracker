import {
  getTransactions,
  getFinanceCategories,
  getFinanceBudgets,
  materializeDueRecurringTransactions,
} from "@/lib/queries/finance";
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
  // Before reading the ledger, so any transaction a recurring rule (rent,
  // subscriptions — see lib/finance/recurring.ts) generated today or since
  // the last visit is already included below, not one page load behind.
  await materializeDueRecurringTransactions(today);
  const transactions = await getTransactions(categories);

  return (
    <FinanceClient transactions={transactions} categories={categories} budgets={budgets} currency={currency} today={today} />
  );
}
