"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";
import { isLocale } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentUserId, getCurrentUserIdOrNull } from "@/lib/auth/session";
import type { ThemePreference } from "@/lib/queries/user";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Antes de tener sesión (selector en login/signup) la elección se guarda
 * como cookie puente. Con sesión (selector en Ajustes) se guarda en la
 * cuenta directamente, igual que `setThemePreference`. */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const userId = await getCurrentUserIdOrNull();
  if (userId) {
    await db.update(users).set({ localePreference: locale }).where(eq(users.id, userId));
    return;
  }
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR_SECONDS });
}

export async function setDayCutoffHour(hour: number) {
  const store = await cookies();
  store.set("habito_day_cutoff", String(hour), { path: "/", maxAge: YEAR_SECONDS });
}

/** Guarda la preferencia de tema en la cuenta, para que siga al usuario entre dispositivos. */
export async function setThemePreference(theme: string) {
  if (theme !== "light" && theme !== "dark" && theme !== "system") return;
  const userId = await getCurrentUserId();
  await db
    .update(users)
    .set({ themePreference: theme satisfies ThemePreference })
    .where(eq(users.id, userId));
}
