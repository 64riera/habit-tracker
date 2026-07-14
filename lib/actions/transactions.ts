"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { notifyDeviceSync } from "@/lib/realtime/notify";
import { extractTransactionFields, transactionFormSchema } from "@/lib/validation/transaction";

export type TransactionFormState = { error?: string };

function revalidateFinancePaths() {
  revalidatePath("/");
  revalidatePath("/finance");
  after(() => notifyDeviceSync());
}

export async function createTransaction(
  _prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "invalid" };
  const result = await createTransactionCore(id, extractTransactionFields(formData));
  if (result.error) return result;
  redirect("/finance");
}

export async function createTransactionCore(id: string, rawValues: unknown): Promise<TransactionFormState> {
  const parsed = transactionFormSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();

  // onConflictDoNothing: idempotent if the offline replay retries after a
  // drain gets interrupted between the insert and removing the mutation
  // from the queue (same reasoning as createHabitCore/createTaskCore).
  await db
    .insert(transactions)
    .values({
      id,
      userId,
      type: values.type,
      categoryId: values.type === "expense" ? (values.categoryId ?? null) : null,
      amount: values.amount,
      note: values.note ?? null,
      date: values.date,
    })
    .onConflictDoNothing({ target: transactions.id });

  revalidateFinancePaths();
  return {};
}

export async function updateTransaction(
  transactionId: string,
  _prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const result = await updateTransactionCore(transactionId, extractTransactionFields(formData));
  if (result.error) return result;
  redirect("/finance");
}

export async function updateTransactionCore(transactionId: string, rawValues: unknown): Promise<TransactionFormState> {
  const parsed = transactionFormSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();

  await db
    .update(transactions)
    .set({
      type: values.type,
      categoryId: values.type === "expense" ? (values.categoryId ?? null) : null,
      amount: values.amount,
      note: values.note ?? null,
      date: values.date,
    })
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  revalidateFinancePaths();
  return {};
}

/** Online path: writes via the core and redirects. The offline replay uses `deleteTransactionCore` directly. */
export async function deleteTransaction(transactionId: string): Promise<void> {
  await deleteTransactionCore(transactionId);
  redirect("/finance");
}

export async function deleteTransactionCore(transactionId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await db.delete(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  revalidateFinancePaths();
}
