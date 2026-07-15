"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { financeBudgets, financeCategories } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";

function revalidateFinanceBudgetPaths() {
  revalidatePath("/finance");
  revalidatePath("/finance/budgets");
}

/** Sets, updates, or clears the monthly limit for one category.
 * `monthlyLimit: null` (or <= 0) removes the budget row entirely — this
 * app models "no budget" as a missing row, not a limit of 0 (see the
 * financeBudgets column comment in lib/db/schema.ts), so a cleared input
 * must delete rather than write a 0. Looks up the category by
 * (id, userId) first so a categoryId can never write into another
 * account's budgets. */
export async function setBudget(categoryId: string, monthlyLimit: number | null): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  const [category] = await db
    .select({ id: financeCategories.id })
    .from(financeCategories)
    .where(and(eq(financeCategories.id, categoryId), eq(financeCategories.userId, userId)));
  if (!category) return { error: "category" };

  if (monthlyLimit === null || !(monthlyLimit > 0)) {
    await db.delete(financeBudgets).where(and(eq(financeBudgets.categoryId, categoryId), eq(financeBudgets.userId, userId)));
    revalidateFinanceBudgetPaths();
    return {};
  }

  await db
    .insert(financeBudgets)
    .values({ id: nanoid(), userId, categoryId, monthlyLimit })
    .onConflictDoUpdate({ target: [financeBudgets.userId, financeBudgets.categoryId], set: { monthlyLimit } });

  revalidateFinanceBudgetPaths();
  return {};
}
