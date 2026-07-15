import { getFinanceBudgets, getFinanceCategories } from "@/lib/queries/finance";
import { FinanceBudgetsClient } from "./finance-budgets-client";

export default async function FinanceBudgetsPage() {
  const [categories, budgets] = await Promise.all([getFinanceCategories(), getFinanceBudgets()]);
  return <FinanceBudgetsClient categories={categories} budgets={budgets} />;
}
