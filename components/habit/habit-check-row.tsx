"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { logHabit, deleteLog } from "@/lib/actions/logs";
import { categoryLabel, describeFrequency } from "@/lib/habits/describe";
import type { HabitWithExtras } from "@/lib/queries/habits";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Props = {
  habit: HabitWithExtras;
  date: string;
  compact?: boolean;
};

const CAT_COLOR: Record<string, string> = {
  creatividad: "var(--color-cat-creatividad)",
  fitness: "var(--color-cat-fitness)",
  aprendizaje: "var(--color-cat-aprendizaje)",
  estudio: "var(--color-cat-estudio)",
  bienestar: "var(--color-cat-bienestar)",
};

export function HabitCheckRow({ habit, date, compact }: Props) {
  const { t, dict } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(habit.todayLog?.status ?? null);
  const [value, setValue] = useState(habit.todayLog?.value ?? 0);

  const color = habit.categoryId ? CAT_COLOR[habit.categoryId] ?? "var(--color-text)" : "var(--color-text)";
  const isBinary = habit.goalType === "binary";
  const target = habit.goalTarget ?? 1;
  const step = Math.max(target / 4, 1);

  const isDone = status === "done";
  const progressPct = isBinary ? (isDone ? 100 : 0) : Math.min(100, Math.round((value / target) * 100));

  function handleClick() {
    if (isBinary) {
      if (isDone) {
        setStatus(null);
        startTransition(async () => {
          await deleteLog(habit.id, date);
          router.refresh();
        });
      } else {
        setStatus("done");
        startTransition(async () => {
          await logHabit({ habitId: habit.id, date, status: "done" });
          router.refresh();
        });
      }
      return;
    }

    const next = value + step;
    if (next >= target) {
      setStatus("done");
      setValue(target);
      startTransition(async () => {
        await logHabit({ habitId: habit.id, date, status: "done", value: target });
        router.refresh();
      });
    } else if (isDone) {
      // ya estaba completo: reinicia el ciclo
      setStatus(null);
      setValue(0);
      startTransition(async () => {
        await deleteLog(habit.id, date);
        router.refresh();
      });
    } else {
      setStatus("partial");
      setValue(next);
      startTransition(async () => {
        await logHabit({ habitId: habit.id, date, status: "partial", value: next });
        router.refresh();
      });
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b border-border py-3.5",
        isPending && "opacity-70"
      )}
    >
      <Link
        href={`/habitos/${habit.id}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif-italic text-[15px] font-semibold md:h-[42px] md:w-[42px] md:text-[17px]"
        style={{ background: `color-mix(in oklch, ${color} 16%, transparent)`, color }}
      >
        {habit.name.charAt(0).toUpperCase()}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold md:text-[15px]">{habit.name}</div>
        <div className="mt-0.5 truncate text-[11px] text-muted md:text-xs">
          {!compact && habit.category ? `${categoryLabel(habit.categoryId, dict)} · ` : ""}
          {describeFrequency(habit, dict)}
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
          <div className="text-[9px] tracking-wide text-muted uppercase">{t("common.days")}</div>
        </div>
      )}
      <button
        type="button"
        aria-label={t("checkin.markDone")}
        onClick={handleClick}
        disabled={isPending}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors md:h-7 md:w-7"
        style={{
          borderColor: isDone ? "var(--color-accent)" : "var(--color-border)",
          background:
            status === "partial"
              ? `linear-gradient(90deg, var(--color-accent) ${progressPct}%, transparent ${progressPct}%)`
              : isDone
                ? "var(--color-accent)"
                : "transparent",
        }}
      >
        {isDone && <span className="text-[13px] text-accent-contrast">✓</span>}
      </button>
    </div>
  );
}
