import { z } from "zod";

export const transactionFormSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: z.coerce.number().positive().max(999_999_999),
    categoryId: z.string().trim().min(1).optional(),
    note: z.string().trim().max(200).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  // Category is mandatory for expenses (so spend can always be broken down
  // by category); income has no categories at all, see canonical-categories.ts.
  .refine((v) => v.type === "income" || !!v.categoryId, {
    message: "category required for expenses",
    path: ["categoryId"],
  });

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
