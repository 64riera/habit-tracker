import { z } from "zod";
import { isoDateSchema, moneyAmountSchema, requireCategoryForExpense, categoryRequiredIssue } from "./primitives";

export const transactionFormSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: moneyAmountSchema,
    categoryId: z.string().trim().min(1).optional(),
    note: z.string().trim().max(200).optional(),
    date: isoDateSchema,
  })
  .refine(requireCategoryForExpense, categoryRequiredIssue);

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export function extractTransactionFields(formData: FormData): unknown {
  return {
    type: formData.get("type"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId") || undefined,
    note: formData.get("note") || undefined,
    date: formData.get("date"),
  };
}
