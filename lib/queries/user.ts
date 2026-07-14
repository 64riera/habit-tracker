import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentUserIdOrNull } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/dictionaries";

export type ThemePreference = "light" | "dark" | "system";
export type CurrencyPreference = "MXN" | "USD";

/** Theme preference saved on the account. "system" if there's no session (e.g. /login). */
export async function getThemePreference(): Promise<ThemePreference> {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return "system";
  const [user] = await db
    .select({ themePreference: users.themePreference })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.themePreference ?? "system";
}

/** Language preference saved on the account. `null` if there's no session
 * (e.g. /login, /signup) — there the language is resolved through other
 * means, see `getCurrentLocale()` in lib/i18n/locale.ts. */
export async function getLocalePreference(): Promise<Locale | null> {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return null;
  const [user] = await db
    .select({ localePreference: users.localePreference })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.localePreference ?? null;
}

/** Currency preference saved on the account. "MXN" if there's no session. */
export async function getCurrencyPreference(): Promise<CurrencyPreference> {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return "MXN";
  const [user] = await db
    .select({ currencyPreference: users.currencyPreference })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.currencyPreference ?? "MXN";
}

/** IANA timezone saved on the account (detected in the browser, see
 * `timezone-sync.tsx`). `null` if there's no session or it hasn't been detected yet. */
export async function getTimezonePreference(): Promise<string | null> {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return null;
  const [user] = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.timezone ?? null;
}

/** Last BPM used in the metronome (see app/(dashboard)/metronome). 120 —
 * a common default tempo — if there's no session. */
export async function getMetronomeBpm(): Promise<number> {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return 120;
  const [user] = await db.select({ metronomeBpm: users.metronomeBpm }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.metronomeBpm ?? 120;
}

/** Whether the install-suggestion modal after their first habit has
 * already been shown (and decided on) — see install-suggestion-modal.tsx.
 * `true` if there's no session, so it's never offered on public pages. */
export async function getInstallPromptSeen(): Promise<boolean> {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return true;
  const [user] = await db
    .select({ installPromptSeen: users.installPromptSeen })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.installPromptSeen ?? true;
}
