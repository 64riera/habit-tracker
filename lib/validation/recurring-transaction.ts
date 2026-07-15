import { z } from "zod";

export const recurringTransactionFormSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: z.coerce.number().positive().max(999_999_999),
    categoryId: z.string().trim().min(1).optional(),
    note: z.string().trim().max(200).optional(),
    recurrenceType: z.enum(["monthly", "yearly"]),
    dayOfMonth: z.coerce.number().int().min(1).max(31),
    month: z.coerce.number().int().min(1).max(12).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  // Same rule as one-off transactions (lib/validation/transaction.ts):
  // category is mandatory for expenses, income has no categories at all.
  .refine((v) => v.type === "income" || !!v.categoryId, {
    message: "category required for expenses",
    path: ["categoryId"],
  })
  .refine((v) => v.recurrenceType === "monthly" || v.month !== undefined, {
    message: "month required for yearly recurrence",
    path: ["month"],
  });

export type RecurringTransactionFormValues = z.infer<typeof recurringTransactionFormSchema>;
