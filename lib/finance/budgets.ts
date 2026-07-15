export type BudgetState = "ok" | "warning" | "over";

export type BudgetStatus = {
  spent: number;
  limit: number;
  /** Fraction spent, unclamped — 1.12 means 12% over, not capped at 1. */
  ratio: number;
  /** Same ratio as a whole-percent integer, for display. */
  pct: number;
  state: BudgetState;
  /** Only meaningful when state === "over"; how much past the limit. */
  overBy: number;
};

const WARNING_THRESHOLD = 0.8;

/** Pure — the "spent" side is whatever the caller already aggregated for
 * the current calendar month (see summarizeTransactions in aggregate.ts),
 * kept separate from limit lookup so this has no DB/query dependency and
 * is trivially unit-testable. */
export function budgetStatus(spent: number, limit: number): BudgetStatus {
  const ratio = limit > 0 ? spent / limit : 0;
  const pct = Math.round(ratio * 100);
  const state: BudgetState = ratio > 1 ? "over" : ratio >= WARNING_THRESHOLD ? "warning" : "ok";
  return { spent, limit, ratio, pct, state, overBy: state === "over" ? spent - limit : 0 };
}
