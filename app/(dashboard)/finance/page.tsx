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
  // Fired alongside the batch below (it touches recurringTransactions/
  // transactions, not categories/currency/budgets, so it doesn't need to
  // wait behind them) and only awaited once getTransactions actually needs
  // its result — see lib/finance/recurring.ts.
  const materializePromise = materializeDueRecurringTransactions(today);
  const [categories, currency, budgets] = await Promise.all([
    getFinanceCategories(),
    getCurrencyPreference(),
    getFinanceBudgets(),
  ]);
  await materializePromise;
  const transactions = await getTransactions(categories);

  return (
    <FinanceClient transactions={transactions} categories={categories} budgets={budgets} currency={currency} today={today} />
  );
}
