"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Hash } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import { categoryDisplayName, describeFrequency, describeGoal, habitAvatarGlyph } from "@/lib/habits/describe";
import type { HabitWithExtras } from "@/lib/queries/habits";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LogEditor } from "./log-editor";
import { PendingSyncBadge } from "@/components/offline/pending-sync-badge";
import type { LogStatus } from "@/lib/habits/status";
import { getStatusVisual } from "@/lib/habits/status-visual";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Props = {
  habit: HabitWithExtras;
  date: string;
  compact?: boolean;
  /** The habit itself (not the check-in) has an unsynced creation/edit/archive. */
  isPendingSync?: boolean;
};

export function HabitCheckRow({ habit, date, compact, isPendingSync }: Props) {
  const { t, dict, locale } = useI18n();
  const router = useRouter();
  const { runOrQueue } = useOffline();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<LogStatus | null>(
    (habit.todayLog?.status as LogStatus) ?? null
  );
  const [value, setValue] = useState(habit.todayLog?.value ?? 0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const color = habit.category?.color ?? "var(--color-text)";
  const isBinary = habit.goalType === "binary";
  const isDuration = habit.goalType === "duration";
  const target = habit.goalTarget ?? 1;

  const isDone = status === "done";
  const progressPct = isBinary ? (isDone ? 100 : 0) : Math.min(100, Math.round((value / target) * 100));

  const visual = getStatusVisual(status, progressPct);

  function logDone(doneValue?: number) {
    setStatus("done");
    if (doneValue != null) setValue(doneValue);
    startTransition(async () => {
      await runOrQueue({
        type: "log",
        input: { habitId: habit.id, date, status: "done", value: doneValue },
      });
      router.refresh();
    });
  }

  function handleClick() {
    if (isBinary) {
      if (isDone) {
        setStatus(null);
        startTransition(async () => {
          await runOrQueue({ type: "delete", habitId: habit.id, date });
          router.refresh();
        });
      } else {
        logDone();
      }
      return;
    }

    if (isDone) {
      // Already complete: confirm before losing the day's progress.
      setConfirmOpen(true);
      return;
    }

    if (isDuration) {
      // Duration completes in a single tap; the editor ("⋯") remains
      // available to enter a partial value by hand.
      logDone(target);
      return;
    }

    // Quantitative: filled one unit at a time per tap.
    const next = value + 1;
    if (next >= target) {
      logDone(target);
    } else {
      setStatus("partial");
      setValue(next);
      startTransition(async () => {
        await runOrQueue({ type: "log", input: { habitId: habit.id, date, status: "partial", value: next } });
        router.refresh();
      });
    }
  }

  function handleUnmarkConfirmed() {
    setStatus(null);
    setValue(0);
    startTransition(async () => {
      await runOrQueue({ type: "delete", habitId: habit.id, date });
      router.refresh();
    });
  }

  return (
    <div className={cn(isPendingSync && "opacity-70")}>
      <div className="flex items-center gap-4 border-b border-border py-3.5">
        <Link
          href={`/habits/${habit.id}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif-italic text-[15px] font-semibold md:h-[42px] md:w-[42px] md:text-[17px]"
          style={{ background: `color-mix(in oklch, ${color} 16%, transparent)`, color }}
        >
          {habitAvatarGlyph(habit)}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold md:text-[15px]">
            {habit.isPinned && (
              <span className="mr-1" style={{ color: "var(--color-accent)" }} aria-hidden>
                ★
              </span>
            )}
            <span className="truncate">{habit.name}</span>
            {isPendingSync && <PendingSyncBadge />}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted md:text-xs">
            <span className="min-w-0 truncate">
              {!compact && habit.category ? `${categoryDisplayName(habit.category, locale)} · ` : ""}
              {describeFrequency(habit, dict)}
            </span>
            {!isBinary && (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[9px]">
                {isDuration ? (
                  <Clock size={9} strokeWidth={2.2} aria-hidden />
                ) : (
                  <Hash size={9} strokeWidth={2.2} aria-hidden />
                )}
                {isDuration ? describeGoal(habit) : `${Math.min(value, target)}/${target}`}
              </span>
            )}
          </div>
          {!isBinary && (
            <div className="mt-2 h-0.5 w-40 max-w-full rounded-full bg-border">
              <div
                className="h-0.5 rounded-full bg-text transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
        {!compact && (
          <div className="shrink-0 text-right">
            <div className="font-serif text-base font-semibold">{habit.streak.current}</div>
            <div className="text-[9px] tracking-wide text-muted uppercase">
              {habit.streak.current === 1 ? t("common.day") : t("common.days")}
            </div>
          </div>
        )}
        {!compact && (
          <button
            type="button"
            aria-label={t("checkin.moreOptions")}
            aria-expanded={editorOpen}
            onClick={() => setEditorOpen((v) => !v)}
            className="-m-2 shrink-0 p-2 text-sm text-muted"
          >
            ⋯
          </button>
        )}
        <button
          type="button"
          aria-label={isDone ? t("checkin.unmark") : t("checkin.markDone")}
          onClick={handleClick}
          className="-m-2 flex shrink-0 items-center justify-center p-2"
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] transition-colors md:h-7 md:w-7"
            style={{ borderColor: visual.border, background: visual.background }}
          >
            {visual.icon && (
              <span className="text-[11px]" style={{ color: visual.iconColor }}>
                {visual.icon}
              </span>
            )}
          </span>
        </button>
      </div>
      {editorOpen && (
        <LogEditor
          habit={habit}
          date={date}
          onChange={(newStatus, newValue) => {
            setStatus(newStatus);
            setValue(newValue ?? 0);
          }}
        />
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("checkin.unmarkConfirmTitle")}
        description={t("checkin.unmarkConfirmBody")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleUnmarkConfirmed}
      />
    </div>
  );
}
