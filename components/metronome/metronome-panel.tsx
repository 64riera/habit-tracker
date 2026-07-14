"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Minus, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Select } from "@/components/ui/select";
import { setMetronomeBpm } from "@/lib/actions/preferences";
import { METRONOME_SOUNDS, DEFAULT_METRONOME_SOUND, type MetronomeSoundId } from "@/lib/metronome/sounds";

const MIN_BPM = 40;
const MAX_BPM = 208;
const PERSIST_DEBOUNCE_MS = 500;
// Shorter than the persistence debounce on purpose: this one gates the
// audible tempo change, so it should feel responsive right after letting
// go of the slider, not just eventually consistent in the background.
const TEMPO_APPLY_DEBOUNCE_MS = 150;

export function MetronomePanel({ initialBpm }: { initialBpm: number }) {
  const { t } = useI18n();
  const [bpm, setBpm] = useState(initialBpm);
  const [soundId, setSoundId] = useState<MetronomeSoundId>(DEFAULT_METRONOME_SOUND);
  const [playing, setPlaying] = useState(false);
  const [pulse, setPulse] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The tempo actually driving the ticking loop, plus whether the slider is
  // actively being moved right now — deliberately NOT the same as `bpm`
  // (which updates on every slider move/keystroke). The instant `bpm`
  // changes, `isAdjusting` flips true and the ticking effect below goes
  // silent immediately (it doesn't wait for its own interval to notice);
  // only ~150ms after the *last* change does it settle, adopt the new
  // tempo, and resume with one audible tick. This is what makes the
  // metronome mute itself for as long as the slider is being dragged,
  // instead of just not stuttering while it changes.
  const [committedBpm, setCommittedBpm] = useState(initialBpm);
  const [isAdjusting, setIsAdjusting] = useState(false);
  // "Adjusting state during render" (https://react.dev/reference/react/useState#storing-information-from-previous-renders),
  // same pattern already used elsewhere in this codebase (e.g.
  // SwipeableRow's lastSeenOpenId) — flips `isAdjusting` true in the same
  // render `bpm` changes in, instead of one effect-cycle later, so the
  // ticking effect below goes silent immediately rather than after one
  // more tick slips through.
  const [lastSeenBpm, setLastSeenBpm] = useState(bpm);
  if (bpm !== lastSeenBpm) {
    setLastSeenBpm(bpm);
    setIsAdjusting(true);
  }
  useEffect(() => {
    if (!isAdjusting) return;
    const id = setTimeout(() => {
      setCommittedBpm(bpm);
      setIsAdjusting(false);
    }, TEMPO_APPLY_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [bpm, isAdjusting]);

  const sound = useMemo(() => METRONOME_SOUNDS.find((s) => s.id === soundId) ?? METRONOME_SOUNDS[0], [soundId]);
  const soundOptions = useMemo(() => METRONOME_SOUNDS.map((s) => ({ value: s.id, label: t(s.labelKey) })), [t]);

  function changeBpm(next: number) {
    const clamped = Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, next)));
    setBpm(clamped);
    // Debounced, not on every step: dragging the slider or tapping ±
    // repeatedly would otherwise fire a write per tick. Best-effort: the
    // metronome itself never depends on this succeeding (it's pure Web
    // Audio, no network involved), so a failed write while offline is
    // swallowed rather than surfacing as a console error — the next
    // successful change picks up the persistence again.
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      setMetronomeBpm(clamped).catch(() => {});
    }, PERSIST_DEBOUNCE_MS);
  }

  // The ticking loop itself — silent while `isAdjusting` (see above), and
  // restarts on every *committed* tempo change or sound change so the new
  // setting takes effect right away instead of only after the current
  // interval finishes. Plain setInterval (not a lookahead scheduler): this
  // is a casual practice aid, not a precision audio tool, and the small
  // drift that comes with it is an acceptable trade for how much simpler
  // it keeps this.
  useEffect(() => {
    if (!playing || isAdjusting) return;
    function tick() {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = audioCtxRef.current ?? new AudioCtx();
        audioCtxRef.current = ctx;
        sound.play(ctx);
      }
      setPulse(true);
      setTimeout(() => setPulse(false), 100);
    }
    tick();
    const id = setInterval(tick, 60_000 / committedBpm);
    return () => clearInterval(id);
  }, [playing, isAdjusting, committedBpm, sound]);

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

        <Select
          value={soundId}
          onValueChange={(value) => setSoundId(value as MetronomeSoundId)}
          options={soundOptions}
          variant="pill"
          ariaLabel={t("metronome.sound.label")}
        />

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
