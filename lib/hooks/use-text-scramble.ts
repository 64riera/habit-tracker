"use client";

import { useEffect, useRef, useState } from "react";

const DIGIT_CHARS = "0123456789";
const ALPHA_CHARS = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
const DURATION_MS = 480;
const FPS = 30;

/**
 * Reveals `target` left to right, showing random characters in the
 * positions not yet revealed — a subtle "decoding" effect (not a slot
 * machine) that fits the app's editorial tone. Spaces and punctuation
 * marks are not scrambled, so the word cadence stays legible while the
 * rest resolves.
 *
 * Doesn't animate on the first render (when `target` arrives empty/initial):
 * it only transitions between two already-displayed real values, avoiding
 * a gratuitous scramble on mount.
 */
export function useTextScramble(target: string, variant: "digits" | "alpha" = "alpha") {
  const [display, setDisplay] = useState(target);
  const prevTarget = useRef(target);
  const hasMounted = useRef(false);
  const charset = variant === "digits" ? DIGIT_CHARS : ALPHA_CHARS;

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      prevTarget.current = target;
      setDisplay(target);
      return;
    }
    if (prevTarget.current === target) return;
    prevTarget.current = target;

    let raf: number;
    let frame = 0;
    const totalFrames = Math.round((DURATION_MS / 1000) * FPS);

    function tick() {
      frame++;
      const progress = Math.min(1, frame / totalFrames);
      const revealCount = Math.floor(progress * target.length);
      let out = "";
      for (let i = 0; i < target.length; i++) {
        const ch = target[i];
        out += i < revealCount || !/[a-zA-Z0-9]/.test(ch) ? ch : charset[Math.floor(Math.random() * charset.length)];
      }
      setDisplay(out);
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, charset]);

  return display;
}
