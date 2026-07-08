"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Detecta si hay contenido tapado detrás de una barra `sticky top-0` de
 * alto constante. Un centinela de alto 0 se coloca justo debajo de la
 * barra; en cuanto ese punto deja de ser visible (offset por el alto real
 * de la barra vía rootMargin, no por el techo del viewport), sabemos que
 * el usuario scrolleó y hay contenido corriendo bajo la barra.
 *
 * Compartido por las variantes de ContentHeader: TopLevelHeader lo usa
 * para cruzar el título por opacidad, y ambas lo usan para activar el
 * fondo translúcido/blur al estilo barra de navegación de iOS.
 */
export function useScrolledPastBar<TBar extends HTMLElement>(): {
  barRef: RefObject<TBar | null>;
  sentinelRef: RefObject<HTMLDivElement | null>;
  isScrolled: boolean;
} {
  const barRef = useRef<TBar>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const bar = barRef.current;
    const sentinel = sentinelRef.current;
    if (!bar || !sentinel) return;
    const barHeight = bar.getBoundingClientRect().height;
    const observer = new IntersectionObserver(([entry]) => setIsScrolled(!entry.isIntersecting), {
      threshold: 0,
      rootMargin: `-${barHeight}px 0px 0px 0px`,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { barRef, sentinelRef, isScrolled };
}
