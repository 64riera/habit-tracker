"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Minus, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { setMetronomeBpm } from "@/lib/actions/preferences";

const MIN_BPM = 40;
const MAX_BPM = 208;
const PERSIST_DEBOUNCE_MS = 500;

function createClick(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 1000;
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

export function MetronomePanel({ initialBpm }: { initialBpm: number }) {
  const { t } = useI18n();
  const [bpm, setBpm] = useState(initialBpm);
  const [playing, setPlaying] = useState(false);
  const [pulse, setPulse] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function changeBpm(next: number) {
    const clamped = Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, next)));
    setBpm(clamped);
    // Debounced, not on every step: dragging the slider or tapping ±
    // repeatedly would otherwise fire a write per tick.
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => setMetronomeBpm(clamped), PERSIST_DEBOUNCE_MS);
  }

  // The ticking loop itself — restarts on every bpm change so the new
  // tempo takes effect immediately instead of only after the current
  // interval finishes. Plain setInterval (not a lookahead scheduler): this
  // is a casual practice aid, not a precision audio tool, and the small
  // drift that comes with it is an acceptable trade for how much simpler
  // it keeps this.
  useEffect(() => {
    if (!playing) return;
    function tick() {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = audioCtxRef.current ?? new AudioCtx();
        audioCtxRef.current = ctx;
        createClick(ctx);
      }
      setPulse(true);
      setTimeout(() => setPulse(false), 100);
    }
    tick();
    const id = setInterval(tick, 60_000 / bpm);
    return () => clearInterval(id);
  }, [playing, bpm]);

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close();
    };
  }, []);

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-10 w-10 items-center justify-center" aria-hidden>
          <span
            className="absolute h-3 w-3 rounded-full bg-text transition-[transform,opacity] duration-100 ease-out"
            style={{ transform: pulse ? "scale(2.4)" : "scale(1)", opacity: pulse ? 1 : 0.3 }}
          />
        </div>

        <div className="text-center">
          <div className="font-serif-italic text-[52px] leading-none font-semibold tabular-nums">{bpm}</div>
          <div className="mt-1.5 text-[10px] tracking-wide text-muted uppercase">{t("metronome.bpm")}</div>
        </div>

        <div className="flex w-full max-w-xs items-center gap-2.5">
          <button
            type="button"
            onClick={() => changeBpm(bpm - 1)}
            aria-label={t("metronome.decrease")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted"
          >
            <Minus size={14} strokeWidth={2} aria-hidden />
          </button>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => changeBpm(Number(e.target.value))}
            aria-label={t("metronome.bpm")}
            className="h-1.5 flex-1 accent-text"
          />
          <button
            type="button"
            onClick={() => changeBpm(bpm + 1)}
            aria-label={t("metronome.increase")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted"
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? t("metronome.pause") : t("metronome.play")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-text text-surface"
        >
          {playing ? <Pause size={20} strokeWidth={2} aria-hidden /> : <Play size={20} strokeWidth={2} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
