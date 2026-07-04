"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";
import { isLocale } from "@/lib/i18n/dictionaries";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR_SECONDS });
}

export async function setDayCutoffHour(hour: number) {
  const store = await cookies();
  store.set("habito_day_cutoff", String(hour), { path: "/", maxAge: YEAR_SECONDS });
}
