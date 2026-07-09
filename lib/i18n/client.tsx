"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import type { Dictionary, Locale } from "./dictionaries";
import esDict from "@/messages/es.json";
import enDict from "@/messages/en.json";
import { translate } from "./t";
import { setLocale as setLocaleAction } from "@/lib/actions/preferences";

// Ambos diccionarios viven en el cliente para que cambiar de idioma sea
// instantaneo, sin depender de un reload ni de un round-trip al servidor.
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

  // I18nProvider vive en el layout raíz, compartido entre TODAS las rutas
  // (incluidas /login y /signup) — una navegación client-side no lo
  // remonta, así que `useState(locale)` solo captura el valor inicial. Si
  // el locale que calcula el servidor cambia entre una navegación y otra
  // (p. ej. justo al iniciar sesión: la pantalla de login lo detectaba por
  // dispositivo, y ya logueado pasa a la preferencia guardada en la
  // cuenta), hay que resincronizar el estado local — mismo patrón de
  // "ajustar estado durante el render" que usa use-live-focus-state.ts.
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
          // Persiste la preferencia para la proxima visita/SSR; la UI ya
          // cambio de idioma de inmediato con el diccionario local.
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
