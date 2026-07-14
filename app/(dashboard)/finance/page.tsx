import { getTransactions, getFinanceCategories } from "@/lib/queries/finance";
import { getCurrencyPreference } from "@/lib/queries/user";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { FinanceClient } from "./finance-client";

export default async function FinancePage() {
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const [categories, currency] = await Promise.all([getFinanceCategories(), getCurrencyPreference()]);
  const transactions = await getTransactions(categories);

  return <FinanceClient transactions={transactions} categories={categories} currency={currency} today={today} />;
}
