"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { recurringTransactions } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { recurringTransactionFormSchema } from "@/lib/validation/recurring-transaction";

function revalidateFinanceRecurringPaths() {
  revalidatePath("/finance");
  revalidatePath("/finance/recurring");
}

export async function createRecurringTransaction(rawValues: unknown): Promise<{ error?: string }> {
  const parsed = recurringTransactionFormSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();

  await db.insert(recurringTransactions).values({
    id: nanoid(),
    userId,
    type: values.type,
    categoryId: values.type === "expense" ? (values.categoryId ?? null) : null,
    amount: values.amount,
    note: values.note ?? null,
    recurrenceType: values.recurrenceType,
    dayOfMonth: values.dayOfMonth,
    month: values.recurrenceType === "yearly" ? (values.month ?? null) : null,
    startDate: values.startDate,
  });

  revalidateFinanceRecurringPaths();
  return {};
}

export async function updateRecurringTransaction(ruleId: string, rawValues: unknown): Promise<{ error?: string }> {
  const parsed = recurringTransactionFormSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();

  await db
    .update(recurringTransactions)
    .set({
      type: values.type,
      categoryId: values.type === "expense" ? (values.categoryId ?? null) : null,
      amount: values.amount,
      note: values.note ?? null,
      recurrenceType: values.recurrenceType,
      dayOfMonth: values.dayOfMonth,
      month: values.recurrenceType === "yearly" ? (values.month ?? null) : null,
      startDate: values.startDate,
    })
    .where(and(eq(recurringTransactions.id, ruleId), eq(recurringTransactions.userId, userId)));

  revalidateFinanceRecurringPaths();
  return {};
}

export async function setRecurringTransactionActive(ruleId: string, active: boolean): Promise<void> {
  const userId = await getCurrentUserId();
  await db
    .update(recurringTransactions)
    .set({ active })
    .where(and(eq(recurringTransactions.id, ruleId), eq(recurringTransactions.userId, userId)));

  revalidateFinanceRecurringPaths();
}
