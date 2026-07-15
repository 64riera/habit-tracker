import "server-only";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habitStreaks, habits, users } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";

export type DashboardShellCounts = {
  streakMax: number | null;
  habitCount: number;
  installPromptSeen: boolean;
};

/**
 * The 3 dashboard-shell values that are exclusive to app/(dashboard)/layout.tsx
 * (verified via repo-wide grep — nothing else calls the queries this
 * replaces), combined into a single `db.batch()` round-trip instead of 3
 * separate ones. Same pattern as `loadHabitContext` (lib/habits/log-write.ts).
 *
 * Deliberately does NOT include timezone or focus settings here even though
 * they're also read by the layout: both are reused elsewhere in the same
 * request tree via their own `cache()` (getServerToday, focus-stats/
 * focus-forest), so folding them into this batch would break that dedup
 * instead of saving a round-trip.
 */
export const getDashboardShellCounts = cache(async (): Promise<DashboardShellCounts> => {
  const userId = await getCurrentUserId();
  const [streakRows, habitCountRows, userRows] = await db.batch([
    db.select({ longestStreak: habitStreaks.longestStreak }).from(habitStreaks).where(eq(habitStreaks.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(habits).where(eq(habits.userId, userId)),
    db.select({ installPromptSeen: users.installPromptSeen }).from(users).where(eq(users.id, userId)).limit(1),
  ]);

  return {
    streakMax: streakRows.length > 0 ? Math.max(0, ...streakRows.map((r) => r.longestStreak)) : null,
    habitCount: Number(habitCountRows[0]?.count ?? 0),
    installPromptSeen: userRows[0]?.installPromptSeen ?? true,
  };
});
