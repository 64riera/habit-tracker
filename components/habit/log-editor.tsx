"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/lib/toast/client";
import { useOffline } from "@/lib/offline/client";
import type { HabitWithExtras } from "@/lib/queries/habits";
import type { LogStatus } from "@/lib/habits/status";

const STATUSES = ["done", "partial", "justified", "skipped", "missed"] as const satisfies readonly LogStatus[];
const MOODS = [1, 2, 3, 4, 5] as const;
const MOOD_EMOJI: Record<number, string> = { 1: "😞", 2: "🙁", 3: "😐", 4: "🙂", 5: "😄" };

export function LogEditor({
  habit,
  date,
  onSaved,
  onClose,
}: {
  habit: HabitWithExtras;
  date: string;
  onSaved: (status: LogStatus | null, value?: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { push } = useToast();
  const { runOrQueue } = useOffline();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<LogStatus>((habit.todayLog?.status as LogStatus) ?? "done");
  const [value, setValue] = useState(habit.todayLog?.value ?? habit.goalTarget ?? 0);
  const [note, setNote] = useState(habit.todayLog?.note ?? "");
  const [mood, setMood] = useState<number | null>(habit.todayLog?.mood ?? null);

  const isBinary = habit.goalType === "binary";
  const showNote = status === "partial" || status === "justified" || status === "missed";
  const freezesAvailable = habit.streak.freezesAvailable;

  function handleSave() {
    // Optimista: refleja el guardado y cierra el editor de inmediato; la
    // mutacion real (y el refresh de datos derivados como racha) sigue en
    // segundo plano.
    onSaved(status, isBinary ? undefined : value);
    startTransition(async () => {
      await runOrQueue({
        type: "log",
        input: {
          habitId: habit.id,
          date,
          status,
          value: isBinary ? undefined : value,
          note: note || undefined,
          mood: mood ?? undefined,
        },
      });
      router.refresh();
    });
  }

  /** Deshace el registro de hoy por completo — pensado para cuando se marcó por accidente. */
  function handleClear() {
    onSaved(null);
    startTransition(async () => {
      await runOrQueue({ type: "delete", habitId: habit.id, date });
      router.refresh();
    });
  }

  function handleUseFreeze() {
    // Optimista, igual que handleSave: si el cupo ya se agotó al sincronizar
    // (otro congelado se aplicó primero), el aviso llega vía el toast
    // centralizado de la cola offline, no aquí.
    onSaved("frozen");
    push(t("checkin.freezeUsed"));
    startTransition(async () => {
      await runOrQueue({ type: "freeze", habitId: habit.id, date });
      router.refresh();
    });
  }

  return (
    <div className="mb-3.5 flex flex-col gap-3 rounded-xl border border-border p-3.5">
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className="rounded-full border px-2.5 py-1 text-[10.5px] font-medium"
            style={{
              background: status === s ? "var(--color-text)" : "transparent",
              color: status === s ? "var(--color-surface)" : "var(--color-muted)",
              borderColor: status === s ? "var(--color-text)" : "var(--color-border)",
            }}
          >
            {t(`checkin.logStatus.${s}`)}
          </button>
        ))}
      </div>

      {status === "missed" && freezesAvailable > 0 && (
        <div className="flex items-center justify-between gap-2.5 rounded-lg border border-dashed border-border px-3 py-2">
          <span className="text-[10.5px] text-muted">
            {t("checkin.freezesLeft", { count: freezesAvailable })}
          </span>
          <button
            type="button"
            onClick={handleUseFreeze}
            disabled={isPending}
            className="shrink-0 rounded-full px-3 py-1 text-[10.5px] font-semibold disabled:opacity-60"
            style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
          >
            {t("checkin.useFreeze")}
          </button>
        </div>
      )}

      {!isBinary && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-wide text-muted uppercase">
            {t("checkin.valueLabel")}
          </span>
          <input
            type="number"
            min={0}
            step="any"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-20 rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-text"
          />
          {habit.goalUnit && <span className="text-xs text-muted">{habit.goalUnit}</span>}
        </div>
      )}

      {showNote && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] tracking-wide text-muted uppercase">
            {t("checkin.noteLabel")}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("checkin.notePlaceholder")}
            rows={2}
            className="rounded-md border border-border bg-transparent px-2.5 py-2 text-xs outline-none focus:border-text"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[10px] tracking-wide text-muted uppercase">
          {t("checkin.moodLabel")}
        </span>
        <div className="flex gap-1">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(mood === m ? null : m)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
              style={{
                background: mood === m ? "color-mix(in srgb, var(--color-text) 14%, transparent)" : "transparent",
              }}
            >
              {MOOD_EMOJI[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-text px-4 py-1.5 text-[11.5px] font-semibold text-surface disabled:opacity-60"
        >
          {t("common.save")}
        </button>
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-[11.5px] text-muted">
          {t("common.cancel")}
        </button>
        {habit.todayLog && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="ml-auto flex items-center gap-1.5 text-[11.5px] text-muted disabled:opacity-60"
          >
            <RotateCcw size={12} strokeWidth={2.2} aria-hidden />
            {t("checkin.clearToday")}
          </button>
        )}
      </div>
    </div>
  );
}
