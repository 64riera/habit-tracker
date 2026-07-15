"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { useI18n } from "@/lib/i18n/client";
import { useOffline } from "@/lib/offline/client";
import { describeTaskRecurrence } from "@/lib/tasks/describe";
import { getStatusVisual } from "@/lib/habits/status-visual";
import { PendingSyncBadge } from "@/components/offline/pending-sync-badge";
import { swrKeys } from "@/lib/swr/keys";
import type { TaskWithStatus } from "@/lib/queries/tasks";

export function TaskCheckRow({
  task,
  today,
  isPendingSync,
}: {
  task: TaskWithStatus;
  today: string;
  isPendingSync?: boolean;
}) {
  const { t, dict } = useI18n();
  const { mutate } = useSWRConfig();
  const { runOrQueue } = useOffline();
  const [, startTransition] = useTransition();
  const [isDone, setIsDone] = useState(task.isDone);
  // Two rapid taps used to fire two independent, unsequenced
  // `toggleTaskCore` calls (an insert and a delete) that could resolve out
  // of order — whichever happened to finish last on the server won, not
  // necessarily the user's actual last tap. `pendingRef` sequences them:
  // a tap while a call is already in flight just updates `desired`
  // instead of firing its own call, and the in-flight call re-checks
  // `desired` once it settles, so at most one request is ever in flight
  // and it always ends up reflecting the true final state.
  const pendingRef = useRef(false);
  const desiredRef = useRef<boolean | null>(null);

  const visual = getStatusVisual(isDone ? "done" : null);

  function toggle() {
    const next = !isDone;
    setIsDone(next);
    desiredRef.current = next;
    if (pendingRef.current) return;

    pendingRef.current = true;
    startTransition(async () => {
      while (desiredRef.current !== null) {
        const done = desiredRef.current;
        desiredRef.current = null;
        await runOrQueue({ type: "toggleTask", taskId: task.id, periodKey: task.periodKey, done });
      }
      pendingRef.current = false;
      mutate(swrKeys.tasksList(today));
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
