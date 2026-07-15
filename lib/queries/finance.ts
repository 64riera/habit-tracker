import "server-only";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { financeBudgets, financeCategories, recurringTransactions, transactions } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { CANONICAL_FINANCE_CATEGORIES } from "@/lib/finance/canonical-categories";
import { dueOccurrences } from "@/lib/finance/recurring";

export type FinanceCategoryRow = typeof financeCategories.$inferSelect;
// userId is never read once scoped server-side (see getTransactions below,
// which already excludes it from the SELECT) — narrower than the raw
// inferred row so that omission is a type-checked guarantee, not just a
// convention at the one call site.
export type TransactionRow = Omit<typeof transactions.$inferSelect, "userId">;
export type TransactionWithCategory = TransactionRow & { category: FinanceCategoryRow | null };
export type FinanceBudgetRow = typeof financeBudgets.$inferSelect;
export type RecurringTransactionRow = typeof recurringTransactions.$inferSelect;

/** Expense categories are a fixed set (see lib/finance/canonical-categories.ts):
 * this self-heals any account that's still missing one — created before
 * that category existed — instead of requiring a one-off data migration.
 * Same pattern as getCategories() for habits. */
export const getFinanceCategories = cache(async (): Promise<FinanceCategoryRow[]> => {
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
});

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
export const getTransactions = cache(async (categories: FinanceCategoryRow[]): Promise<TransactionWithCategory[]> => {
  const userId = await getCurrentUserId();
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      categoryId: transactions.categoryId,
      amount: transactions.amount,
      note: transactions.note,
      date: transactions.date,
      recurringTransactionId: transactions.recurringTransactionId,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId));
  const catById = new Map(categories.map((c) => [c.id, c]));
  return rows
    .map((r) => ({ ...r, category: r.categoryId ? (catById.get(r.categoryId) ?? null) : null }))
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
});

/** One row per category that has a monthly limit set — absence of a row
 * means "no budget", not a limit of 0 (see the financeBudgets column
 * comment in lib/db/schema.ts). No canonical/self-heal step here: unlike
 * categories, budgets are opt-in per account, so there's nothing to backfill. */
export const getFinanceBudgets = cache(async (): Promise<FinanceBudgetRow[]> => {
  const userId = await getCurrentUserId();
  return db.select().from(financeBudgets).where(eq(financeBudgets.userId, userId));
});

/** Every recurring rule on the account, active and paused alike — the
 * management screen needs both to offer resume; only active ones are
 * actually materialized (see materializeDueRecurringTransactions). */
export const getRecurringTransactions = cache(async (): Promise<RecurringTransactionRow[]> => {
  const userId = await getCurrentUserId();
  return db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, userId));
});

/**
 * Turns any due occurrence of every active recurring rule into a real
 * transaction row, then advances that rule's cursor to `today` — called
 * once per Finance page load (see app/(dashboard)/finance/page.tsx),
 * mirroring the same self-healing-on-read pattern the rest of this app
 * uses for canonical catalogs (getFinanceCategories, getGymExercises,
 * getGymRoutines), just generating ledger rows instead of catalog rows.
 *
 * Idempotent by construction: each generated transaction's id is
 * deterministic (`${ruleId}:${date}`) and inserted with onConflictDoNothing,
 * so re-running this for a range that was already (partially) processed —
 * e.g. an interrupted request — can never double-insert, even without a
 * surrounding DB transaction.
 */
export async function materializeDueRecurringTransactions(today: string): Promise<void> {
  const userId = await getCurrentUserId();
  const rules = await db
    .select()
    .from(recurringTransactions)
    .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.active, true)));

  for (const rule of rules) {
    const dates = dueOccurrences(rule, today);
    if (dates.length > 0) {
      await db
        .insert(transactions)
        .values(
          dates.map((date) => ({
            id: `${rule.id}:${date}`,
            userId,
            type: rule.type,
            categoryId: rule.categoryId,
            amount: rule.amount,
            note: rule.note,
            date,
            recurringTransactionId: rule.id,
          }))
        )
        .onConflictDoNothing({ target: transactions.id });
    }
    // Skips the write once a rule is already caught up to today (the
    // common case: opening Finance more than once in the same day)
    // instead of an unconditional UPDATE on every single page load.
    if (!rule.lastGeneratedDate || rule.lastGeneratedDate < today) {
      await db
        .update(recurringTransactions)
        .set({ lastGeneratedDate: today })
        .where(eq(recurringTransactions.id, rule.id));
    }
  }
}
