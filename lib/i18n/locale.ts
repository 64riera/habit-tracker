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

/** Device language from the `Accept-Language` header — used before a
 * session exists (login/signup), while the user hasn't touched the
 * selector yet. */
export async function detectDeviceLocale(): Promise<Locale> {
  const store = await headers();
  return firstSupportedLocale(store.get("accept-language"));
}

/** Explicit choice made in the login/signup selector, stored as a browser
 * session cookie — a bridge until `signup()`/`login()` persist it to the
 * account (see `lib/actions/auth.ts`). Once there's a session, this stops
 * being the source of truth: `localePreference` on the account wins, just
 * like the theme (`getThemePreference`), so the language follows the user
 * across devices instead of staying tied to the browser. */
export async function getPreAuthLocaleCookie(): Promise<Locale | null> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : null;
}

/** Language to use for a new account (signup) or when syncing on login:
 * whatever the user explicitly chose in the pre-auth selector if they
 * touched it, otherwise the one detected from the device. */
export async function resolvePreAuthLocale(): Promise<Locale> {
  const explicit = await getPreAuthLocaleCookie();
  return explicit ?? detectDeviceLocale();
}

export async function getCurrentLocale(): Promise<Locale> {
  const accountLocale = await getLocalePreference();
  if (accountLocale) return accountLocale;
  return resolvePreAuthLocale();
}
