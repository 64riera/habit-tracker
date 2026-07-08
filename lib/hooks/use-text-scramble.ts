"use client";

import { useEffect, useRef, useState } from "react";

const DIGIT_CHARS = "0123456789";
const ALPHA_CHARS = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
const DURATION_MS = 480;
const FPS = 30;

/**
 * Revela `target` de izquierda a derecha, mostrando caracteres al azar en
 * las posiciones aún no reveladas — un efecto de "decodificación" discreto
 * (no de tragamonedas) acorde al tono editorial de la app. Espacios y
 * símbolos de puntuación no se scramblean, para que la cadencia de
 * palabras siga siendo legible mientras el resto se resuelve.
 *
 * No anima el primer render (cuando `target` llega vacío/inicial): solo
 * transiciona entre dos valores reales ya mostrados, evitando un scramble
 * gratuito al montar.
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
