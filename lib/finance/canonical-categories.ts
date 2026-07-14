/** Fixed set of expense categories every account gets, mirroring how habit
 * categories work (see lib/habits/canonical-categories.ts): single source
 * of truth for both new signups (seedDefaultFinanceCategories) and the
 * self-healing backfill in getFinanceCategories(), which adds any category
 * here that an existing account is still missing. Income has no category —
 * see lib/validation/transaction.ts. */
export const CANONICAL_FINANCE_CATEGORIES = [
  { nameEs: "Casa", nameEn: "Home", color: "var(--color-cat-home)", icon: "🏠" },
  { nameEs: "Automóvil", nameEn: "Car", color: "var(--color-cat-car)", icon: "🚗" },
  { nameEs: "Supermercado", nameEn: "Groceries", color: "var(--color-cat-groceries)", icon: "🛒" },
  { nameEs: "Comida", nameEn: "Dining out", color: "var(--color-cat-dining)", icon: "🍔" },
  { nameEs: "Entretenimiento", nameEn: "Entertainment", color: "var(--color-cat-entertainment)", icon: "🎬" },
  { nameEs: "Salud", nameEn: "Health", color: "var(--color-cat-health)", icon: "💊" },
  { nameEs: "Transporte", nameEn: "Transport", color: "var(--color-cat-transport)", icon: "🚌" },
  { nameEs: "Servicios", nameEn: "Bills & utilities", color: "var(--color-cat-bills)", icon: "💡" },
  { nameEs: "Educación", nameEn: "Education", color: "var(--color-cat-education)", icon: "🎓" },
  { nameEs: "Otros", nameEn: "Other", color: "var(--color-cat-other)", icon: "📦" },
] as const;
