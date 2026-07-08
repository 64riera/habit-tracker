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
        padding y font-size cambian sin transición a propósito: son
        propiedades de layout, y animarlas mientras el sticky se
        reposiciona en cada frame de scroll (sobre todo con scroll lento
        en móvil, que genera muchos más frames dentro de la ventana de
        transición) hace que compitan por el mismo reflow y se ve como un
        glitch. El cambio instantáneo evita ese choque.
      */}
      <div
        className={cn(
          "sticky top-0 z-10 flex items-start justify-between gap-4 bg-bg",
          isStuck ? "py-2.5" : "pt-7 pb-5 md:pt-9 md:pb-[22px]"
        )}
      >
        <div>
          <div
            className={cn(
              "font-serif-italic leading-tight",
              isStuck ? "text-[17px]" : "text-[26px]"
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
