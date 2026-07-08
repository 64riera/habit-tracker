"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type HoySummary = {
  total: number;
  done: number;
  inProgress: number;
  pct: number;
  bestStreak: { habitName: string; days: number } | null;
};

type Ctx = { summary: HoySummary | null; setSummary: (s: HoySummary) => void };

const HoySummaryContext = createContext<Ctx | null>(null);

/**
 * Vive en page.tsx, fuera del <Suspense key={date}> que envuelve la lista
 * de hábitos: así el resumen (%, racha, barra) sobrevive al remount de
 * HoyClient al cambiar de día, en vez de desaparecer dentro del skeleton
 * de carga. HoyClient reporta el resumen calculado acá cada vez que
 * cambia; HoySummaryDisplay lo lee y anima la transición hacia el nuevo
 * valor en vez de solo reflejarlo.
 */
export function HoySummaryProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<HoySummary | null>(null);
  return <HoySummaryContext.Provider value={{ summary, setSummary }}>{children}</HoySummaryContext.Provider>;
}

export function useHoySummary() {
  const ctx = useContext(HoySummaryContext);
  if (!ctx) throw new Error("useHoySummary debe usarse dentro de HoySummaryProvider");
  return ctx;
}
