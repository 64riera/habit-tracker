"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import type { Dictionary, Locale } from "./dictionaries";
import esDict from "@/messages/es.json";
import enDict from "@/messages/en.json";
import { translate } from "./t";
import { setLocale as setLocaleAction } from "@/lib/actions/preferences";

// Both dictionaries live on the client so that switching languages is
// instant, without depending on a reload or a round-trip to the server.
const DICTS = { es: esDict, en: enDict } as Record<Locale, Dictionary>;

type I18nContextValue = {
  locale: Locale;
  dict: Dictionary;
  t: (path: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  isPending: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState(locale);
  const [isPending, startTransition] = useTransition();

  // I18nProvider lives in the root layout, shared across ALL routes
  // (including /login and /signup) — a client-side navigation doesn't
  // remount it, so `useState(locale)` only captures the initial value. If
  // the locale computed by the server changes between one navigation and
  // the next (e.g. right when logging in: the login screen detected it by
  // device, and once logged in it switches to the preference saved on the
  // account), the local state needs to be resynced — same "adjust state
  // during render" pattern used by use-live-focus-state.ts.
  const [prevLocale, setPrevLocale] = useState(locale);
  if (locale !== prevLocale) {
    setPrevLocale(locale);
    setCurrent(locale);
  }

  const activeDict = DICTS[current] ?? dict;

  const value = useMemo<I18nContextValue>(
    () => ({
      locale: current,
      dict: activeDict,
      t: (path, vars) => translate(activeDict, path, vars),
      setLocale: (next) => {
        setCurrent(next);
        startTransition(() => {
          // Persists the preference for the next visit/SSR; the UI has
          // already switched language immediately using the local dictionary.
          void setLocaleAction(next);
        });
      },
      isPending,
    }),
    [current, activeDict, isPending]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n debe usarse dentro de <I18nProvider>");
  return ctx;
}
