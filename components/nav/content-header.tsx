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
        La transición de padding/font-size solo es segura porque <main>
        tiene overflow-anchor:none (ver layout.tsx) — sin eso, el
        "scroll anchoring" del navegador pelea con el cambio de tamaño en
        cada frame de scroll lento y se ve como un glitch. Con esa pelea
        ya resuelta, animar estas propiedades acá (un cambio de estado
        infrecuente, no continuo) es seguro y se ve más ágil que un salto
        instantáneo.
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
              "font-serif-italic leading-tight transition-[font-size] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
              isStuck ? "text-[17px]" : "text-[26px]"
            )}
          >
            {t(titleKey)}
          </div>
          {/*
            grid-template-rows 1fr->0fr es la forma estándar de animar un
            colapso de alto sin conocerla de antemano (equivalente a
            transicionar a height:auto, que no se puede animar directo).
          */}
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
              isStuck ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-1 text-[12.5px] text-muted">{t(subtitleKey)}</div>
            </div>
          </div>
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
