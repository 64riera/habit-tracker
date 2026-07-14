"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Play, Pause, Square } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatClock } from "@/lib/focus/format";
import { startTimer, pauseTimer, resumeTimer, cancelTimer } from "@/lib/actions/metronome";
import { useLiveTimer } from "./use-live-timer";
import type { TimerRow } from "@/lib/metronome/timer-compute";

const PRESET_MINUTES = [1, 3, 5, 10, 15];

function playDoneSound() {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 660;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.6);
}

export function TimerPanel({ initialTimer }: { initialTimer: TimerRow | null }) {
  const { t } = useI18n();
  const { timer, remaining, finished, setTimer } = useLiveTimer(initialTimer);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [isPending, startTransition] = useTransition();
  const announcedDone = useRef(false);

  // Best-effort: a short beep the moment the countdown hits zero, only
  // while this tab is actually open to hear it — the timer's persisted
  // state (and the "done" display once reopened) doesn't depend on this.
  useEffect(() => {
    if (finished && !announcedDone.current) {
      announcedDone.current = true;
      playDoneSound();
    }
    if (!finished) announcedDone.current = false;
  }, [finished]);

  function handleStart() {
    const totalSeconds = minutes * 60 + seconds;
    if (totalSeconds <= 0) return;
    startTransition(async () => {
      const fresh = await startTimer(totalSeconds);
      setTimer(fresh);
    });
  }

  function handlePause() {
    startTransition(async () => {
      const fresh = await pauseTimer();
      setTimer(fresh);
    });
  }

  function handleResume() {
    startTransition(async () => {
      const fresh = await resumeTimer();
      setTimer(fresh);
    });
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelTimer();
      setTimer(null);
    });
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-[13px] font-semibold">{t("metronome.timer.title")}</div>

      {!timer ? (
        <div className="mt-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-center gap-1.5">
            <input
              type="number"
              min={0}
              max={99}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
              aria-label={t("metronome.timer.minutes")}
              className="w-16 rounded-lg border border-border bg-transparent px-2 py-2 text-center text-lg tabular-nums outline-none focus:border-text"
            />
            <span className="text-lg text-muted">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={seconds}
              onChange={(e) => setSeconds(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
              aria-label={t("metronome.timer.seconds")}
              className="w-16 rounded-lg border border-border bg-transparent px-2 py-2 text-center text-lg tabular-nums outline-none focus:border-text"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {PRESET_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMinutes(m);
                  setSeconds(0);
                }}
                className="rounded-full border border-border px-3 py-1 text-[11.5px] font-medium text-muted"
              >
                {t("metronome.timer.minutesShort", { n: m })}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={isPending || minutes * 60 + seconds <= 0}
            className="mx-auto flex items-center gap-1.5 rounded-lg bg-text px-5 py-2.5 text-[13px] font-semibold text-surface disabled:opacity-60"
          >
            <Play size={14} strokeWidth={2} aria-hidden />
            {t("metronome.timer.start")}
          </button>
        </div>
      ) : (
        <div className="mt-3.5 flex flex-col items-center gap-3">
          <div className="font-serif-italic text-[44px] leading-none font-semibold tabular-nums">
            {formatClock(Math.ceil(remaining))}
          </div>
          {finished && <div className="text-[12.5px] font-semibold">{t("metronome.timer.done")}</div>}

          <div className="flex items-center gap-2.5">
            {/* Pause/resume is meaningless once the countdown already hit
                zero — only offer dismissing it at that point. */}
            {!finished && (timer.status === "running" ? (
              <button
                type="button"
                onClick={handlePause}
                disabled={isPending}
                aria-label={t("metronome.timer.pause")}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border disabled:opacity-60"
              >
                <Pause size={16} strokeWidth={2} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResume}
                disabled={isPending}
                aria-label={t("metronome.timer.resume")}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border disabled:opacity-60"
              >
                <Play size={16} strokeWidth={2} aria-hidden />
              </button>
            ))}
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              aria-label={t("metronome.timer.cancel")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted disabled:opacity-60"
            >
              <Square size={14} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
