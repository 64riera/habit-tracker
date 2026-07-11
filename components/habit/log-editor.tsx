"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/lib/toast/client";
import { useOffline } from "@/lib/offline/client";
import type { HabitWithExtras } from "@/lib/queries/habits";
import type { LogStatus } from "@/lib/habits/status";

const STATUSES = ["done", "partial", "justified", "skipped", "missed"] as const satisfies readonly LogStatus[];
const MOODS = [1, 2, 3, 4, 5] as const;
const MOOD_EMOJI: Record<number, string> = { 1: "😞", 2: "🙁", 3: "😐", 4: "🙂", 5: "😄" };

/**
 * No save/cancel/remove buttons: every interaction persists immediately
 * (same as the row's check button and RoutineQuickActions), so there's no
 * "unsaved" state to confirm or discard. Tapping the already-active reason
 * again removes the log entry — this replaces a "Remove today's entry"
 * button with the same toggle gesture the main check button already uses
 * for "done".
 */
export function LogEditor({
  habit,
  date,
  onChange,
}: {
  habit: HabitWithExtras;
  date: string;
  onChange: (status: LogStatus | null, value?: number) => void;
}) {
  const { t } = useI18n();
  const { push } = useToast();
  const { runOrQueue } = useOffline();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<LogStatus | null>((habit.todayLog?.status as LogStatus) ?? null);
  const [value, setValue] = useState(habit.todayLog?.value ?? habit.goalTarget ?? 0);
  const [note, setNote] = useState(habit.todayLog?.note ?? "");
  const [mood, setMood] = useState<number | null>(habit.todayLog?.mood ?? null);

  const isBinary = habit.goalType === "binary";
  const showNote = status === "partial" || status === "justified" || status === "missed";
  const freezesAvailable = habit.streak.freezesAvailable;

  function persist(next: { status: LogStatus; value: number; note: string; mood: number | null }) {
    onChange(next.status, isBinary ? undefined : next.value);
    startTransition(async () => {
      await runOrQueue({
        type: "log",
        input: {
          habitId: habit.id,
          date,
          status: next.status,
          value: isBinary ? undefined : next.value,
          note: next.note || undefined,
          mood: next.mood ?? undefined,
        },
      });
      router.refresh();
    });
  }

  function clear() {
    setStatus(null);
    onChange(null);
    startTransition(async () => {
      await runOrQueue({ type: "delete", habitId: habit.id, date });
      router.refresh();
    });
  }

  function handleStatusClick(s: LogStatus) {
    if (status === s) {
      clear();
      return;
    }
    setStatus(s);
    persist({ status: s, value, note, mood });
  }

  function handleMoodClick(m: number) {
    const next = mood === m ? null : m;
    setMood(next);
    if (status) persist({ status, value, note, mood: next });
  }

  function handleValueBlur() {
    if (status) persist({ status, value, note, mood });
  }

  function handleNoteBlur() {
    if (status) persist({ status, value, note, mood });
  }

  function handleUseFreeze() {
    // Optimistic, same as persist: if the quota already ran out by the time
    // it syncs (another freeze got applied first), the notice arrives via
    // the offline queue's centralized toast, not here.
    setStatus("frozen");
    onChange("frozen");
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
            onClick={() => handleStatusClick(s)}
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
            className="shrink-0 rounded-full px-3 py-1 text-[10.5px] font-semibold"
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
            onBlur={handleValueBlur}
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
            onBlur={handleNoteBlur}
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
              onClick={() => handleMoodClick(m)}
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
    </div>
  );
}
