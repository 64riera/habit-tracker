"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import { describeTaskRecurrence } from "@/lib/tasks/describe";
import { getStatusVisual } from "@/lib/habits/status-visual";
import { PendingSyncBadge } from "@/components/offline/pending-sync-badge";
import type { TaskWithStatus } from "@/lib/queries/tasks";

export function TaskCheckRow({ task, isPendingSync }: { task: TaskWithStatus; isPendingSync?: boolean }) {
  const { t, dict } = useI18n();
  const router = useRouter();
  const { runOrQueue } = useOffline();
  const [, startTransition] = useTransition();
  const [isDone, setIsDone] = useState(task.isDone);

  const visual = getStatusVisual(isDone ? "done" : null);

  function toggle() {
    const next = !isDone;
    setIsDone(next);
    startTransition(async () => {
      await runOrQueue({ type: "toggleTask", taskId: task.id, periodKey: task.periodKey, done: next });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 border-b border-border py-3">
      <Link
        href={`/tasks/${task.id}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif-italic text-[15px] font-semibold"
        style={{ background: "color-mix(in oklch, var(--color-text) 8%, transparent)", color: "var(--color-muted)" }}
      >
        {task.title.charAt(0).toUpperCase()}
      </Link>
      <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold">
          <span className="truncate">{task.title}</span>
          {isPendingSync && <PendingSyncBadge />}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted">{describeTaskRecurrence(task, dict)}</div>
      </Link>
      <button
        type="button"
        aria-label={isDone ? t("tasks.unmark") : t("tasks.markDone")}
        onClick={toggle}
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
  );
}
