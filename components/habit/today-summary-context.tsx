"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type TodaySummary = {
  total: number;
  done: number;
  inProgress: number;
  pct: number;
  bestStreak: { habitName: string; days: number } | null;
};

type Ctx = { summary: TodaySummary | null; setSummary: (s: TodaySummary) => void };

const TodaySummaryContext = createContext<Ctx | null>(null);

/**
 * Vive en page.tsx, fuera del <Suspense key={date}> que envuelve la lista
 * de hábitos: así el resumen (%, racha, barra) sobrevive al remount de
 * TodayClient al cambiar de día, en vez de desaparecer dentro del skeleton
 * de carga. TodayClient reporta el resumen calculado acá cada vez que
 * cambia; TodaySummaryDisplay lo lee y anima la transición hacia el nuevo
 * valor en vez de solo reflejarlo.
 */
export function TodaySummaryProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  return <TodaySummaryContext.Provider value={{ summary, setSummary }}>{children}</TodaySummaryContext.Provider>;
}

export function useTodaySummary() {
  const ctx = useContext(TodaySummaryContext);
  if (!ctx) throw new Error("useTodaySummary debe usarse dentro de TodaySummaryProvider");
  return ctx;
}
