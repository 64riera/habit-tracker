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

/** Zona horaria IANA guardada en la cuenta (detectada en el navegador, ver
 * `timezone-sync.tsx`). `null` si no hay sesion o aun no se detecto. */
export async function getTimezonePreference(): Promise<string | null> {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return null;
  const [user] = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.timezone ?? null;
}

/** Si ya se le mostró (y decidió algo en) el modal de sugerencia de
 * instalación tras su primer hábito — ver install-suggestion-modal.tsx.
 * `true` si no hay sesión, para no ofrecerlo nunca en páginas públicas. */
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
