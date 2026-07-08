"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { LangToggle } from "./lang-toggle";
import { ThemeToggle } from "./theme-toggle";

export function ContentHeader({
  titleKey,
  subtitleKey,
  showControls = true,
}: {
  titleKey: string;
  subtitleKey: string;
  /** Ajustes ya muestra tema/idioma como filas propias; evita mostrarlos dos veces. */
  showControls?: boolean;
}) {
  const { t } = useI18n();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    // Un centinela de 1px justo antes del header: cuando sale del viewport
    // por scroll, el header (sticky, inmediatamente después) acaba de
    // "engancharse" arriba. Evita escuchar el scroll a mano.
    const observer = new IntersectionObserver(([entry]) => setIsStuck(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden />
      {/*
        El tamaño del título se anima con transform:scale (GPU, no
        dispara layout) en vez de font-size: animar font-size fuerza a
        recalcular el texto en cada frame, que es justo lo que se sentía
        "trabado". padding sigue transicionando (una sola propiedad de
        layout, cambio de estado infrecuente, seguro gracias a
        overflow-anchor:none en <main> — ver layout.tsx).
      */}
      <div
        className={cn(
          "sticky top-0 z-10 flex items-start justify-between gap-4 bg-bg transition-[padding] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          isStuck ? "py-2.5" : "pt-7 pb-5 md:pt-9 md:pb-[22px]"
        )}
      >
        <div>
          <div
            className={cn(
              "font-serif-italic text-[26px] leading-tight origin-top-left transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
              isStuck ? "scale-[0.654]" : "scale-100"
            )}
          >
            {t(titleKey)}
          </div>
          {!isStuck && <div className="mt-1 text-[12.5px] text-muted">{t(subtitleKey)}</div>}
        </div>
        {showControls && (
          <div
            className={cn(
              "flex shrink-0 items-center gap-2 md:flex-row md:gap-3.5",
              isStuck ? "flex-row" : "flex-col items-end md:items-center"
            )}
          >
            <ThemeToggle />
            <LangToggle />
          </div>
        )}
      </div>
    </>
  );
}
