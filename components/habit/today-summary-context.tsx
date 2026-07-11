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
 * Lives in page.tsx, outside the <Suspense key={date}> that wraps the habit
 * list: this way the summary (%, streak, bar) survives TodayClient's
 * remount when the day changes, instead of disappearing inside the loading
 * skeleton. TodayClient reports the computed summary here every time it
 * changes; TodaySummaryDisplay reads it and animates the transition to the
 * new value instead of just reflecting it.
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
