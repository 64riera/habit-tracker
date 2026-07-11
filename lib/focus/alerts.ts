/**
 * Chime synthesized with Web Audio (no binary asset to bundle): a short,
 * soft tone, not a shrill alarm — in keeping with the calm editorial tone
 * of the rest of the app.
 */
export function playChime() {
  try {
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    osc.onended = () => ctx.close();
  } catch {
    // Web Audio unavailable/unsupported — silent, doesn't block anything.
  }
}

const FLASH_INTERVAL_MS = 1000;
const FLASH_DURATION_MS = 8000;

/** Alternates the tab title with `message` — but only if the tab is in
 * the background; if it's visible, the UI already notifies on its own. */
export function flashTitle(message: string) {
  if (typeof document === "undefined" || document.visibilityState !== "hidden") return;

  const original = document.title;
  let flipped = false;
  const intervalId = setInterval(() => {
    document.title = flipped ? original : message;
    flipped = !flipped;
  }, FLASH_INTERVAL_MS);

  function stop() {
    clearInterval(intervalId);
    document.title = original;
    document.removeEventListener("visibilitychange", onVisible);
  }
  function onVisible() {
    if (document.visibilityState === "visible") stop();
  }
  document.addEventListener("visibilitychange", onVisible);
  setTimeout(stop, FLASH_DURATION_MS);
}
