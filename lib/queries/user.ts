import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentUserIdOrNull } from "@/lib/auth/session";
import { resizeGoogleAvatarUrl } from "@/lib/auth/google";
import type { Locale } from "@/lib/i18n/dictionaries";

export type ThemePreference = "light" | "dark" | "system";
export type DarkVariant = "original" | "oled";
export type LightVariant = "warm" | "clear";
export type CurrencyPreference = "MXN" | "USD";

/** Theme preference saved on the account. "system" if there's no session
 * (e.g. /login). Memoized with `cache()`: read from RootLayout,
 * `generateViewport`, and `generateMetadata` in the same request. */
export const getThemePreference = cache(async (): Promise<ThemePreference> => {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return "system";
  const [user] = await db
    .select({ themePreference: users.themePreference })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.themePreference ?? "system";
});

/** Dark mode style saved on the account — only visible while dark mode is
 * active. "oled" if there's no session, matching the column default.
 * Memoized with `cache()`, same reasoning as `getThemePreference`. */
export const getDarkVariant = cache(async (): Promise<DarkVariant> => {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return "oled";
  const [user] = await db
    .select({ darkVariant: users.darkVariant })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.darkVariant ?? "oled";
});

/** Light mode style saved on the account — only visible while light mode is
 * active. "clear" if there's no session, matching the column default.
 * Memoized with `cache()`, same reasoning as `getThemePreference`. */
export const getLightVariant = cache(async (): Promise<LightVariant> => {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return "clear";
  const [user] = await db
    .select({ lightVariant: users.lightVariant })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.lightVariant ?? "clear";
});

/** Language preference saved on the account. `null` if there's no session
 * (e.g. /login, /signup) — there the language is resolved through other
 * means, see `getCurrentLocale()` in lib/i18n/locale.ts. */
export const getLocalePreference = cache(async (): Promise<Locale | null> => {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return null;
  const [user] = await db
    .select({ localePreference: users.localePreference })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.localePreference ?? null;
});

/** Currency preference saved on the account. "MXN" if there's no session. */
export const getCurrencyPreference = cache(async (): Promise<CurrencyPreference> => {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return "MXN";
  const [user] = await db
    .select({ currencyPreference: users.currencyPreference })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.currencyPreference ?? "MXN";
});

/** IANA timezone saved on the account (detected in the browser, see
 * `timezone-sync.tsx`). `null` if there's no session or it hasn't been detected yet. */
export const getTimezonePreference = cache(async (): Promise<string | null> => {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return null;
  const [user] = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.timezone ?? null;
});

/** Last BPM used in the metronome (see app/(dashboard)/metronome). 120 —
 * a common default tempo — if there's no session. */
export const getMetronomeBpm = cache(async (): Promise<number> => {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return 120;
  const [user] = await db.select({ metronomeBpm: users.metronomeBpm }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.metronomeBpm ?? 120;
});

export type UserProfile = { username: string; name: string | null; email: string | null; avatarUrl: string | null };

/** Account identity for display (Settings' profile header) — `name`/
 * `avatarUrl` are only ever populated by a Google login (see
 * app/api/auth/google/callback/route.ts) and stay `null` for an account
 * that has never used it, so callers fall back to `username`. `null`
 * entirely if there's no session. */
export const getUserProfile = cache(async (): Promise<UserProfile | null> => {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return null;
  const [user] = await db
    .select({ username: users.username, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;
  // Resized here too (not just at login, see getGoogleProfile), so an
  // account whose avatarUrl was stored before this existed also benefits
  // without needing to log in again — idempotent on an already-resized URL.
  return user.avatarUrl ? { ...user, avatarUrl: resizeGoogleAvatarUrl(user.avatarUrl) } : user;
});
