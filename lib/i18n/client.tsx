"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import type { Dictionary, Locale } from "./dictionaries";
import { translate } from "./t";
import { setLocale as setLocaleAction } from "@/lib/actions/preferences";

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

  const value = useMemo<I18nContextValue>(
    () => ({
      locale: current,
      dict,
      t: (path, vars) => translate(dict, path, vars),
      setLocale: (next) => {
        setCurrent(next);
        startTransition(() => {
          void setLocaleAction(next).then(() => {
            window.location.reload();
          });
        });
      },
      isPending,
    }),
    [current, dict, isPending]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n debe usarse dentro de <I18nProvider>");
  return ctx;
}
