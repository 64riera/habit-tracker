import { z } from "zod";

/** `YYYY-MM-DD` — shared by every form that stores a plain calendar date (transactions, gym sessions). */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Shared by transactions and recurring transactions — capped well above anything a personal
 * finance log would ever see, just to keep `amount` out of pathological-number territory. */
export const moneyAmountSchema = z.coerce.number().positive().max(999_999_999);

/** Category is mandatory for expenses (so spend can always be broken down by category); income
 * has no categories at all, see canonical-categories.ts. Same rule for one-off and recurring
 * transactions — attach with `.refine(requireCategoryForExpense, categoryRequiredIssue)`. */
export function requireCategoryForExpense(v: { type: "income" | "expense"; categoryId?: string }): boolean {
  return v.type === "income" || !!v.categoryId;
}

export const categoryRequiredIssue = {
  message: "category required for expenses",
  path: ["categoryId"],
};

/** The common check behind habit's "weekdays" frequency and task's "custom_weekdays"
 * recurrence — each domain still guards it behind its own outer condition. */
export function hasAtLeastOneWeekday(weekdays: number[] | undefined): boolean {
  return (weekdays?.length ?? 0) > 0;
}

/** `weekdays` travels as repeated `<input name="weekdays">` values — shared extraction for
 * habit and task forms. */
export function extractWeekdays(formData: FormData): number[] {
  return formData.getAll("weekdays").map(Number);
}
