import { getFinanceCategories, getRecurringTransactions } from "@/lib/queries/finance";
import { getCurrencyPreference } from "@/lib/queries/user";
import { getServerToday } from "@/lib/settings/date-server";
import { FinanceRecurringClient } from "./finance-recurring-client";

export default async function FinanceRecurringPage() {
  const today = await getServerToday();
  const [categories, rules, currency] = await Promise.all([
    getFinanceCategories(),
    getRecurringTransactions(),
    getCurrencyPreference(),
  ]);
  return <FinanceRecurringClient categories={categories} rules={rules} currency={currency} today={today} />;
}
