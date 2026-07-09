"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { useScrolledPastBar } from "@/lib/hooks/use-scrolled-past-bar";
import { LangToggle } from "./lang-toggle";
import { ThemeToggle } from "./theme-toggle";

function HeaderControls({ showControls }: { showControls: boolean }) {
  if (!showControls) return null;
  return (
    <div className="flex shrink-0 items-center gap-2 md:gap-3.5">
      <ThemeToggle />
      <LangToggle />
    </div>
  );
}

/** Vidrio esmerilado de la barra fija, al estilo iOS: opaca y a ras de la
 * página hasta que hay contenido real corriendo debajo, ahí se vuelve
 * translúcida + blur. El blur/saturación quedan siempre aplicados (inocuos
 * con el fondo opaco de reposo) — nunca se anima el propio `backdrop-filter`,
 * que sería costoso; solo transicionan `background-color` y `box-shadow`,
 * ambos baratos y sin layout.
 *
 * Debe seguir siendo opaca en reposo (no transparente): mientras el usuario
 * scrollea, el "hero" de TopLevelHeader pasa por detrás de esta barra antes
 * de que isScrolled se active (recién se activa cuando el hero quedó
 * totalmente tapado) — si la barra fuera transparente en ese tramo, el
 * título grande se vería asomando sin difuminar, sin ninguna capa que lo
 * oculte.
 *
 * La separación con el contenido es sombra difusa + un hairline casi
 * invisible (tokens `--header-hairline`/`--header-shadow`, ver
 * globals.css) en vez de un borde sólido — en claro la sombra hace el
 * trabajo, en oscuro pesa más el hairline, porque las sombras casi no se
 * notan sobre fondos oscuros. */
function barMaterialClass(isScrolled: boolean) {
  return cn(
    "backdrop-blur-xl backdrop-saturate-[1.2]",
    "transition-[background-color,box-shadow] duration-[320ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
    isScrolled
      ? "bg-bg/80 shadow-[0_1px_0_0_var(--header-hairline),0_18px_28px_-22px_var(--header-shadow)]"
      : "bg-bg shadow-[0_1px_0_0_transparent,0_18px_28px_-22px_transparent]"
  );
}

/** Pantallas de nivel superior (Hoy, Historial, etc.): título grande que se
 * va con el scroll nativo, y una versión compacta que cruza por opacidad
 * en la barra fija una vez que el título grande queda tapado.
 *
 * `headerAccessory` (opcional, p. ej. el chip de sesión de enfoque en vivo)
 * ocupa el mismo espacio que el título compacto mientras este todavía no
 * se muestra: mientras no hay scroll el hero grande de abajo hace de
 * título, así que ese hueco a la izquierda de la barra está libre. En
 * cuanto `isScrolled` activa el título compacto, el accesorio cruza a
 * `opacity-0` en el mismo crossfade — nunca compiten por el espacio. */
function TopLevelHeader({
  titleKey,
  subtitleKey,
  showControls,
  headerAccessory,
}: {
  titleKey: string;
  subtitleKey: string;
  showControls: boolean;
  headerAccessory?: React.ReactNode;
}) {
  const { t } = useI18n();
  const { barRef, sentinelRef: heroRef, isScrolled } = useScrolledPastBar<HTMLDivElement>();

  return (
    <>
      {/*
        Alto constante siempre: nada acá cambia de tamaño con el scroll, así
        que <main> nunca ve fluctuar su scrollHeight por culpa del header —
        eso era lo que forzaba saltos de scroll en páginas con poco
        contenido. Solo la opacidad del título compacto (y del accesorio,
        si hay) cruza (GPU, no dispara layout); el título grande de abajo se
        va con el scroll nativo del documento, sin ninguna animación de
        tamaño.
      */}
      <div
        ref={barRef}
        className={cn(
          "sticky top-0 z-10 flex items-center justify-between gap-4 py-2.5",
          barMaterialClass(isScrolled)
        )}
      >
        {/* grid (no absolute): título y accesorio se apilan en la misma
            celda, así el contenedor mide por el más alto de los dos en vez
            de necesitar una altura fija a mano. */}
        <div className="grid min-w-0 flex-1 items-center">
          <div
            className={cn(
              "col-start-1 row-start-1 truncate font-serif-italic text-[17px] leading-tight transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
              isScrolled ? "opacity-100" : "opacity-0"
            )}
            aria-hidden={!isScrolled}
          >
            {t(titleKey)}
          </div>
          {headerAccessory && (
            <div
              className={cn(
                "col-start-1 row-start-1 transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                isScrolled ? "pointer-events-none opacity-0" : "opacity-100"
              )}
              aria-hidden={isScrolled}
            >
              {headerAccessory}
            </div>
          )}
        </div>
        <HeaderControls showControls={showControls} />
      </div>

      <div ref={heroRef} className="pb-5 md:pb-[22px]">
        <div className="font-serif-italic text-[26px] leading-tight">{t(titleKey)}</div>
        <div className="mt-1 text-[12.5px] text-muted">{t(subtitleKey)}</div>
      </div>
    </>
  );
}

/** Subvistas (fuera de la nav principal, con flecha para volver): el título
 * vive únicamente en la barra fija, siempre visible, sin animación — no
 * necesitan el momento de título grande de las pantallas de nivel
 * superior. */
function SubViewHeader({
  titleKey,
  subtitleKey,
  showControls,
  backHref,
}: {
  titleKey: string;
  subtitleKey: string;
  showControls: boolean;
  backHref: string;
}) {
  const { t } = useI18n();
  const { barRef, sentinelRef, isScrolled } = useScrolledPastBar<HTMLDivElement>();

  return (
    <>
      <div
        ref={barRef}
        className={cn(
          "sticky top-0 z-10 flex items-center justify-between gap-4 py-2.5",
          barMaterialClass(isScrolled)
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={backHref}
            aria-label={t("common.back")}
            className="-m-2 shrink-0 rounded-full p-2 text-muted"
          >
            <ArrowLeft size={17} strokeWidth={2} aria-hidden />
          </Link>
          <div className="truncate font-serif-italic text-[17px] leading-tight">{t(titleKey)}</div>
        </div>
        <HeaderControls showControls={showControls} />
      </div>
      {/* Centinela de 1px: no hay "hero" en las subvistas, así que este
          punto marca dónde empieza el contenido real que puede quedar
          tapado bajo la barra. Alto 0 sería ambiguo para el observer al
          caer justo en el borde de su rootMargin; 1px lo resuelve sin
          agregar espacio perceptible. */}
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <div className="pb-5 text-[12.5px] text-muted md:pb-[22px]">{t(subtitleKey)}</div>
    </>
  );
}

export function ContentHeader({
  titleKey,
  subtitleKey,
  showControls = true,
  backHref,
  headerAccessory,
}: {
  titleKey: string;
  subtitleKey: string;
  /** Ajustes ya muestra tema/idioma como filas propias; evita mostrarlos dos veces. */
  showControls?: boolean;
  /** Pantallas anidadas (no en la nav principal) muestran una flecha para volver al listado padre. */
  backHref?: string;
  /** Solo aplica a pantallas de nivel superior (sin `backHref`): en las
   * anidadas el título y la flecha de volver siempre están visibles, así
   * que nunca hay espacio libre en la barra donde mostrarlo. */
  headerAccessory?: React.ReactNode;
}) {
  return backHref ? (
    <SubViewHeader
      titleKey={titleKey}
      subtitleKey={subtitleKey}
      showControls={showControls}
      backHref={backHref}
    />
  ) : (
    <TopLevelHeader
      titleKey={titleKey}
      subtitleKey={subtitleKey}
      showControls={showControls}
      headerAccessory={headerAccessory}
    />
  );
}
