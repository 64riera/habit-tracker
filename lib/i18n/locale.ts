import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./dictionaries";
import { getLocalePreference } from "@/lib/queries/user";

export const LOCALE_COOKIE = "justgo_locale";

function firstSupportedLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  for (const tag of acceptLanguage.split(",")) {
    const lang = tag.trim().split(";")[0]?.split("-")[0]?.toLowerCase();
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

/** Idioma del dispositivo a partir del header `Accept-Language` — se usa
 * antes de que exista sesión (login/signup) cuando el usuario todavía no
 * tocó el selector. */
export async function detectDeviceLocale(): Promise<Locale> {
  const store = await headers();
  return firstSupportedLocale(store.get("accept-language"));
}

/** Elección explícita hecha en el selector de login/signup, guardada como
 * cookie de sesión de navegador — puente hasta que `signup()`/`login()` la
 * persistan en la cuenta (ver `lib/actions/auth.ts`). Una vez hay sesión,
 * esto deja de ser la fuente de verdad: gana `localePreference` en la
 * cuenta, igual que el tema (`getThemePreference`), para que el idioma siga
 * al usuario entre dispositivos en vez de quedar atado al navegador. */
export async function getPreAuthLocaleCookie(): Promise<Locale | null> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : null;
}

/** Idioma a usar para una cuenta nueva (signup) o al sincronizar en login:
 * lo que el usuario eligió explícitamente en el selector pre-auth si lo
 * tocó, si no el detectado del dispositivo. */
export async function resolvePreAuthLocale(): Promise<Locale> {
  const explicit = await getPreAuthLocaleCookie();
  return explicit ?? detectDeviceLocale();
}

export async function getCurrentLocale(): Promise<Locale> {
  const accountLocale = await getLocalePreference();
  if (accountLocale) return accountLocale;
  return resolvePreAuthLocale();
}
