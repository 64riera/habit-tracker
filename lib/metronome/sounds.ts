export type MetronomeSoundId = "classic" | "soft" | "wood" | "digital";

type ToneOptions = {
  type: OscillatorType;
  frequency: number;
  /** If set, the pitch glides from `frequency` down to this by the end of
   * the tone — what gives the "wood" option its percussive knock. */
  endFrequency?: number;
  duration: number;
  gain: number;
};

/** One short, percussive tone — every metronome sound is built from this,
 * just with a different waveform/pitch/envelope. No audio files: all four
 * options are synthesized with the Web Audio API, same as the original
 * single sound this replaces. */
function playTone(ctx: AudioContext, { type, frequency, endFrequency, duration, gain }: ToneOptions) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + duration);
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gainNode).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export type MetronomeSound = { id: MetronomeSoundId; labelKey: string; play: (ctx: AudioContext) => void };

export const METRONOME_SOUNDS: MetronomeSound[] = [
  {
    id: "classic",
    labelKey: "metronome.sound.classic",
    play: (ctx) => playTone(ctx, { type: "sine", frequency: 1000, duration: 0.05, gain: 0.35 }),
  },
  {
    id: "soft",
    labelKey: "metronome.sound.soft",
    play: (ctx) => playTone(ctx, { type: "sine", frequency: 700, duration: 0.09, gain: 0.28 }),
  },
  {
    id: "wood",
    labelKey: "metronome.sound.wood",
    play: (ctx) => playTone(ctx, { type: "triangle", frequency: 1800, endFrequency: 700, duration: 0.03, gain: 0.4 }),
  },
  {
    id: "digital",
    labelKey: "metronome.sound.digital",
    play: (ctx) => playTone(ctx, { type: "square", frequency: 1500, duration: 0.035, gain: 0.2 }),
  },
];

export const DEFAULT_METRONOME_SOUND: MetronomeSoundId = "classic";
