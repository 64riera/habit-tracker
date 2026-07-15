/**
 * Single source of truth for every SWR cache key used across the dashboard.
 * Array-form keys ([name, ...args]) so SWR invokes each fetcher as
 * `fetcher(...args)` — the exact signature the read actions already have.
 * Centralizing this (instead of ad-hoc string keys at each call site) is
 * what lets `drainQueue` (lib/offline/client.tsx) revalidate "everything
 * currently mounted" with a single global `mutate()` call after a sync.
 */
export const swrKeys = {
  focusHeader: () => ["focus:header"] as const,
  categories: () => ["habits:categories"] as const,
  habitNames: () => ["habits:names"] as const,

  todayHabits: (date: string) => ["today:habits", date] as const,
  habitsList: (today: string) => ["habits:list", today] as const,
  routines: (today: string) => ["routines:list", today] as const,

  tasksList: (today: string) => ["tasks:list", today] as const,

  financeTransactions: () => ["finance:transactions"] as const,
  financeCategories: () => ["finance:categories"] as const,
  financeBudgets: () => ["finance:budgets"] as const,

  gymSessions: () => ["gym:sessions"] as const,
  gymExercises: () => ["gym:exercises"] as const,

  history: (today: string, habitId: string, categoryId: string, rangeDays: number) =>
    ["history", today, habitId, categoryId, rangeDays] as const,
  stats: (today: string) => ["stats", today] as const,

  focusSupporting: (today: string) => ["focus:supporting", today] as const,
  focusHistoryList: (habitId: string, categoryId: string) => ["focus:history-list", habitId, categoryId] as const,
  focusStats: (today: string) => ["focus:stats", today] as const,
} as const;
