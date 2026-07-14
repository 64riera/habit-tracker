import { getTransactions, getFinanceCategories } from "@/lib/queries/finance";
import { getCurrencyPreference } from "@/lib/queries/user";
import { getServerToday } from "@/lib/settings/date-server";
import { FinanceClient } from "./finance-client";

export default async function FinancePage() {
  const today = await getServerToday();
  const [categories, currency] = await Promise.all([getFinanceCategories(), getCurrencyPreference()]);
  const transactions = await getTransactions(categories);

  return <FinanceClient transactions={transactions} categories={categories} currency={currency} today={today} />;
}
