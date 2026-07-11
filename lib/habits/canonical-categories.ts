/** Fixed set of categories every account gets. Categories stopped being
 * user-created/edited/deleted — the only thing a user can do is hide the
 * ones they don't care about (see setCategoryHidden in
 * lib/actions/categories.ts). Single source of truth for both new
 * signups (seedDefaultCategories) and the self-healing backfill in
 * getCategories(), which adds any category here that an existing account
 * is still missing. */
export const CANONICAL_CATEGORIES = [
  { nameEs: "General", nameEn: "General", color: "var(--color-cat-general)", icon: "⭐" },
  { nameEs: "Trabajo", nameEn: "Work", color: "var(--color-cat-trabajo)", icon: "💼" },
  { nameEs: "Creatividad", nameEn: "Creativity", color: "var(--color-cat-creatividad)", icon: "🎨" },
  { nameEs: "Fitness", nameEn: "Fitness", color: "var(--color-cat-fitness)", icon: "💪" },
  { nameEs: "Aprendizaje", nameEn: "Learning", color: "var(--color-cat-aprendizaje)", icon: "🧠" },
  { nameEs: "Estudio", nameEn: "Study", color: "var(--color-cat-estudio)", icon: "📚" },
  { nameEs: "Bienestar", nameEn: "Wellness", color: "var(--color-cat-bienestar)", icon: "🧘" },
] as const;
