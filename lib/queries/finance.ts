import "server-only";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { financeBudgets, financeCategories, transactions } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { CANONICAL_FINANCE_CATEGORIES } from "@/lib/finance/canonical-categories";

export type FinanceCategoryRow = typeof financeCategories.$inferSelect;
export type TransactionRow = typeof transactions.$inferSelect;
export type TransactionWithCategory = TransactionRow & { category: FinanceCategoryRow | null };
export type FinanceBudgetRow = typeof financeBudgets.$inferSelect;

/** Expense categories are a fixed set (see lib/finance/canonical-categories.ts):
 * this self-heals any account that's still missing one — created before
 * that category existed — instead of requiring a one-off data migration.
 * Same pattern as getCategories() for habits. */
export async function getFinanceCategories(): Promise<FinanceCategoryRow[]> {
  const userId = await getCurrentUserId();
  let rows = await db
    .select()
    .from(financeCategories)
    .where(eq(financeCategories.userId, userId))
    .orderBy(financeCategories.sortOrder);

  const existingNames = new Set(rows.map((c) => c.nameEs));
  const missing = CANONICAL_FINANCE_CATEGORIES.filter((c) => !existingNames.has(c.nameEs));
  if (missing.length > 0) {
    const minSortOrder = rows.reduce((min, c) => Math.min(min, c.sortOrder), 0);
    await db.insert(financeCategories).values(
      missing.map((c, i) => ({
        id: nanoid(),
        userId,
        nameEs: c.nameEs,
        nameEn: c.nameEn,
        color: c.color,
        icon: c.icon,
        sortOrder: minSortOrder - missing.length + i,
      }))
    );
    rows = await db
      .select()
      .from(financeCategories)
      .where(eq(financeCategories.userId, userId))
      .orderBy(financeCategories.sortOrder);
  }

  return rows;
}

/**
 * Every transaction on the account, most recent first — no date filter.
 * A personal ledger is small enough (even years of daily entries) to fetch
 * once per page load and slice/aggregate entirely on the client (see
 * lib/finance/aggregate.ts): that's what lets switching between day/week/
 * month/year/custom-range views work with zero network requests, which
 * matters here more than on other screens since Finance is meant to work offline.
 *
 * Takes `categories` instead of calling getFinanceCategories() itself: that
 * function backfills missing canonical categories as a side effect, and
 * callers already need the category list for their own rendering — fetching
 * it twice in the same Promise.all raced the backfill insert and produced
 * duplicate rows. Call getFinanceCategories() once per request and share it.
 */
export async function getTransactions(categories: FinanceCategoryRow[]): Promise<TransactionWithCategory[]> {
  const userId = await getCurrentUserId();
  const rows = await db.select().from(transactions).where(eq(transactions.userId, userId));
  const catById = new Map(categories.map((c) => [c.id, c]));
  return rows
    .map((r) => ({ ...r, category: r.categoryId ? (catById.get(r.categoryId) ?? null) : null }))
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}

/** One row per category that has a monthly limit set — absence of a row
 * means "no budget", not a limit of 0 (see the financeBudgets column
 * comment in lib/db/schema.ts). No canonical/self-heal step here: unlike
 * categories, budgets are opt-in per account, so there's nothing to backfill. */
export async function getFinanceBudgets(): Promise<FinanceBudgetRow[]> {
  const userId = await getCurrentUserId();
  return db.select().from(financeBudgets).where(eq(financeBudgets.userId, userId));
}
