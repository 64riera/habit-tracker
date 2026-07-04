"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { AchievementType } from "@/lib/achievements";

type Toast = { id: string; title: string; body?: string };

type ToastContextValue = {
  push: (title: string, body?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((title: string, body?: string) => {
    const id = `${Date.now()}-${counter.current++}`;
    setToasts((prev) => [...prev, { id, title, body }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-bg px-4 py-3 shadow-lg"
          >
            <div className="font-serif-italic text-[13.5px] font-semibold">{toast.title}</div>
            {toast.body && <div className="mt-0.5 text-[11.5px] text-muted">{toast.body}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

/** Notifica logros recién desbloqueados (respuesta de `logHabit`) como toasts. */
export function useAchievementToast() {
  const { push } = useToast();
  const { t } = useI18n();
  return useCallback(
    (unlocked: AchievementType[]) => {
      for (const type of unlocked) {
        push(t("achievements.toastTitle"), t(`achievements.types.${type}`));
      }
    },
    [push, t]
  );
}
