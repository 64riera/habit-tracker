"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Check, Pause, Play } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useFocusRewardToast } from "@/lib/toast/client";
import { useLiveFocusState } from "@/lib/focus/use-live-focus-state";
import { useFocusStatusAlerts } from "@/lib/focus/use-focus-status-alerts";
import { flashTitle, playChime } from "@/lib/focus/alerts";
import { formatClock } from "@/lib/focus/format";
import { LIVE_STATUSES, type FocusSessionRow } from "@/lib/focus/compute";
import { APP_NAME } from "@/lib/branding";
import {
  cancelFocusSession,
  finishFocusSession,
  getActiveFocusSessionAction,
  pauseFocusSession,
  resumeFocusSession,
} from "@/lib/actions/focus";
import { BreakBanner } from "./break-banner";

/** "Cancel session" only makes sense as a quick exit for a session started
 * by mistake — past this threshold of real active time, it's hidden so as
 * not to invite abandoning a session already in progress (the user can
 * still "Finish" at any time). */
const CANCEL_VISIBLE_ACTIVE_SECONDS = 10;

export function FocusTimerDisplay({
  session: initialSession,
  soundEnabled,
}: {
  session: FocusSessionRow;
  soundEnabled: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const notifyRewards = useFocusRewardToast();
  const { session, state } = useLiveFocusState(initialSession, getActiveFocusSessionAction, notifyRewards);

  // Covers entering "on_break" and auto-completion while the screen is
  // still being watched: in both cases the component stays mounted long
  // enough to observe the transition. The manual "Finish" does NOT go
  // through here — that case is triggered by `FinishButton` directly,
  // because the router.refresh() that follows unmounts this component
  // before the transition to "completed" gets reflected in the hook's state.
  useFocusStatusAlerts(session, soundEnabled);

  // Server-side reconciliation can close the session (cap reached) without
  // the user touching anything; as soon as the hook's resync confirms it,
  // the page is refreshed so it goes back to showing the start form instead
  // of being left showing controls for a session that's already closed.
  useEffect(() => {
    if (session && !LIVE_STATUSES.includes(session.status)) router.refresh();
  }, [session, router]);

  if (!session || !state || !LIVE_STATUSES.includes(session.status)) return null;

  const isOnBreak = session.status === "on_break";
  const isPaused = session.status === "paused";
  const bigValueSeconds = session.mode === "countdown" ? state.remainingSeconds ?? 0 : state.activeSeconds;
  const pct = state.capSeconds > 0 ? Math.min(100, Math.round((state.activeSeconds / state.capSeconds) * 100)) : 0;
  const cancelSecondsLeft = CANCEL_VISIBLE_ACTIVE_SECONDS - state.activeSeconds;
  const canCancel = cancelSecondsLeft > 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center gap-4 py-6 text-center md:py-10">
        <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">
          {t(`focus.status.${session.status}`)}
        </div>
        <div className="font-serif-italic text-[56px] leading-none font-semibold tabular-nums md:text-[72px]">
          {formatClock(bigValueSeconds)}
        </div>
        <div className="w-full max-w-xs">
          <div className="h-0.5 rounded-full bg-border">
            <div
              className="h-0.5 rounded-full bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {isOnBreak ? (
        <div className="mt-auto flex flex-col items-center gap-3 pt-6">
          <BreakBanner remainingSeconds={state.breakRemainingSeconds ?? 0} />
          {canCancel && (
            <form
              action={cancelFocusSession}
              onSubmit={(e) => {
                if (!confirm(t("focus.cancelConfirm"))) e.preventDefault();
              }}
            >
              <TextButton label={t("focus.controls.cancel", { seconds: cancelSecondsLeft })} />
            </form>
          )}
        </div>
      ) : (
        <div className="mt-auto flex flex-col items-center gap-3 pt-6">
          <div className="flex items-center justify-center gap-3">
            {isPaused ? (
              <form action={resumeFocusSession}>
                <PrimaryButton icon={Play} label={t("focus.controls.resume")} />
              </form>
            ) : (
              <form action={pauseFocusSession}>
                <PrimaryButton icon={Pause} label={t("focus.controls.pause")} />
              </form>
            )}
            <FinishButton
              label={t("focus.controls.finish")}
              soundEnabled={soundEnabled}
              completeTitle={t("focus.alerts.completeTitle", { name: APP_NAME })}
              onUnlocked={notifyRewards}
            />
          </div>
          {canCancel && (
            <form
              action={cancelFocusSession}
              onSubmit={(e) => {
                if (!confirm(t("focus.cancelConfirm"))) e.preventDefault();
              }}
            >
              <TextButton label={t("focus.controls.cancel", { seconds: cancelSecondsLeft })} />
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/** Doesn't use `<form action>` like the others: it needs to read
 * `unlockedTiers` from the response to trigger the reward toast, and
 * triggers the sound/title alert right here — the `router.refresh()` that
 * follows "Finish" unmounts this tree before `useFocusStatusAlerts` gets to
 * observe the transition to "completed". */
function FinishButton({
  label,
  soundEnabled,
  completeTitle,
  onUnlocked,
}: {
  label: string;
  soundEnabled: boolean;
  completeTitle: string;
  onUnlocked: (tiers: Awaited<ReturnType<typeof finishFocusSession>>["unlockedTiers"]) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const { unlockedTiers } = await finishFocusSession();
          if (soundEnabled) playChime();
          flashTitle(completeTitle);
          onUnlocked(unlockedTiers);
        })
      }
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-5 py-2.5 text-[12.5px] font-medium disabled:opacity-60"
    >
      <Check size={15} strokeWidth={2} aria-hidden />
      {label}
    </button>
  );
}

function PrimaryButton({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg bg-text px-5 py-2.5 text-[12.5px] font-semibold text-surface disabled:opacity-60"
    >
      <Icon size={15} strokeWidth={2} aria-hidden />
      {label}
    </button>
  );
}

/** Deliberately understated style — unlike Pause/Finish, it doesn't compete
 * for attention: it only exists as a quick exit in the first few seconds
 * (see `CANCEL_VISIBLE_ACTIVE_SECONDS`). */
function TextButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-2.5 text-[11px] text-muted/70 transition-colors hover:text-muted disabled:opacity-60"
    >
      {label}
    </button>
  );
}
