"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { LangToggle } from "./lang-toggle";
import { ThemeToggle } from "./theme-toggle";

export function ContentHeader({
  titleKey,
  subtitleKey,
  showControls = true,
  backHref,
}: {
  titleKey: string;
  subtitleKey: string;
  /** Ajustes ya muestra tema/idioma como filas propias; evita mostrarlos dos veces. */
  showControls?: boolean;
  /** Pantallas anidadas (no en la nav principal) muestran una flecha para volver al listado padre. */
  backHref?: string;
}) {
  const { t } = useI18n();
  const barRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const bar = barRef.current;
    const hero = heroRef.current;
    if (!bar || !hero) return;
    // La barra compacta tiene alto fijo y tapa visualmente el título grande
    // apenas su borde inferior llega a la altura de la barra, no recién
    // cuando sale por completo del viewport — rootMargin corre ese límite
    // a la altura real de la barra en vez del techo de la pantalla.
    const barHeight = bar.getBoundingClientRect().height;
    const observer = new IntersectionObserver(([entry]) => setIsStuck(!entry.isIntersecting), {
      threshold: 0,
      rootMargin: `-${barHeight}px 0px 0px 0px`,
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/*
        Alto constante siempre: nada acá cambia de tamaño con el scroll, así
        que <main> nunca ve fluctuar su scrollHeight por culpa del header —
        eso era lo que forzaba saltos de scroll en páginas con poco
        contenido. Solo la opacidad del título compacto cruza (GPU, no
        dispara layout); el título grande de abajo se va con el scroll
        nativo del documento, sin ninguna animación de tamaño.
      */}
      <div
        ref={barRef}
        className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-bg py-2.5"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {backHref && (
            <Link
              href={backHref}
              aria-label={t("common.back")}
              className="-m-2 shrink-0 rounded-full p-2 text-muted"
            >
              <ArrowLeft size={17} strokeWidth={2} aria-hidden />
            </Link>
          )}
          <div
            className={cn(
              "truncate font-serif-italic text-[17px] leading-tight transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
              isStuck ? "opacity-100" : "opacity-0"
            )}
            aria-hidden={!isStuck}
          >
            {t(titleKey)}
          </div>
        </div>
        {showControls && (
          <div className="flex shrink-0 items-center gap-2 md:gap-3.5">
            <ThemeToggle />
            <LangToggle />
          </div>
        )}
      </div>

      <div ref={heroRef} className="pb-5 md:pb-[22px]">
        <div className="flex items-center gap-1.5">
          {backHref && <div className="h-[17px] w-[17px] shrink-0" aria-hidden />}
          <div className="font-serif-italic text-[26px] leading-tight">{t(titleKey)}</div>
        </div>
        <div className={cn("mt-1 text-[12.5px] text-muted", backHref && "pl-[26px]")}>
          {t(subtitleKey)}
        </div>
      </div>
    </>
  );
}
