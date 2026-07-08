"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import type { RoutineToday } from "@/lib/queries/routines";

export function RoutineQuickActions({ routines, date }: { routines: RoutineToday[]; date: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { runOrQueue } = useOffline();
  const [, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(new Set());

  if (routines.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {routines.map((r) => {
        const complete = optimisticDone.has(r.id) || r.doneToday >= r.totalToday;
        return (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{r.name}</div>
              <div className="mt-0.5 text-[11px] text-muted">
                {r.doneToday}/{r.totalToday} · {t("routines.completion")}
              </div>
            </div>
            <button
              type="button"
              disabled={complete}
              onClick={() => {
                setOptimisticDone((prev) => new Set(prev).add(r.id));
                startTransition(async () => {
                  await Promise.all(
                    r.habits.map((h) =>
                      runOrQueue({
                        type: "log",
                        input: {
                          habitId: h.id,
                          date,
                          status: "done",
                          value: h.goalType === "binary" ? undefined : (h.goalTarget ?? undefined),
                        },
                      })
                    )
                  );
                  router.refresh();
                });
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60"
              style={{
                background: complete ? "transparent" : "var(--color-text)",
                color: complete ? "var(--color-muted)" : "var(--color-surface)",
                border: complete ? "1px solid var(--color-border)" : "none",
              }}
            >
              {complete ? <Check size={13} strokeWidth={2.4} aria-hidden /> : <CheckCheck size={13} strokeWidth={2.2} aria-hidden />}
              {complete ? t("checkin.logStatus.done") : t("routines.markAllDone")}
            </button>
          </div>
        );
      })}
    </div>
  );
}
