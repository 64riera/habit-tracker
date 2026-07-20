import { z } from "zod";
import { isoDateSchema, moneyAmountSchema, requireCategoryForExpense, categoryRequiredIssue } from "./primitives";

export const recurringTransactionFormSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: moneyAmountSchema,
    categoryId: z.string().trim().min(1).optional(),
    note: z.string().trim().max(200).optional(),
    recurrenceType: z.enum(["monthly", "yearly"]),
    dayOfMonth: z.coerce.number().int().min(1).max(31),
    month: z.coerce.number().int().min(1).max(12).optional(),
    startDate: isoDateSchema,
  })
  // Same rule as one-off transactions (lib/validation/transaction.ts):
  // category is mandatory for expenses, income has no categories at all.
  .refine(requireCategoryForExpense, categoryRequiredIssue)
  .refine((v) => v.recurrenceType === "monthly" || v.month !== undefined, {
    message: "month required for yearly recurrence",
    path: ["month"],
  });

export type RecurringTransactionFormValues = z.infer<typeof recurringTransactionFormSchema>;
