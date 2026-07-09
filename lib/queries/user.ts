import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentUserIdOrNull } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/dictionaries";

export type ThemePreference = "light" | "dark" | "system";

/** Preferencia de tema guardada en la cuenta. "system" si no hay sesion (p. ej. /login). */
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

/** Preferencia de idioma guardada en la cuenta. `null` si no hay sesion (p.
 * ej. /login, /signup) — ahi el idioma se resuelve por otras vias, ver
 * `getCurrentLocale()` en lib/i18n/locale.ts. */
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
