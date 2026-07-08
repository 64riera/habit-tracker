import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("animate-pulse rounded-md bg-border/70", className)} style={style} />;
}

/** Placeholders de ThemeToggle (3 iconos en píldora) y LangToggle (ES/EN en
 * píldora) — mismas medidas que los componentes reales, ver
 * components/nav/theme-toggle.tsx y lang-toggle.tsx. */
function SkeletonHeaderControls() {
  return (
    <div className="flex shrink-0 items-center gap-2 md:gap-3.5">
      <Skeleton className="h-[26px] w-[74px] rounded-full md:h-[30px] md:w-[86px]" />
      <Skeleton className="h-[26px] w-[58px] rounded-full md:h-[30px] md:w-[66px]" />
    </div>
  );
}

/** Espejo de ContentHeader (components/nav/content-header.tsx): misma fila
 * fija (py-2.5) con los controles a la derecha, y debajo el título — grande
 * a ancho completo para pantallas de nivel superior, compacto junto a una
 * flecha de volver para subvistas. Mismo padding (pb-5/md:pb-[22px]) que el
 * bloque real para que el contenido no salte de alto al montar. */
export function SkeletonContentHeader({ backHref = false }: { backHref?: boolean }) {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-bg py-2.5">
        {backHref ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <Skeleton className="h-[17px] w-[17px] shrink-0 rounded-full" />
            <Skeleton className="h-[17px] w-28" />
          </div>
        ) : (
          <div />
        )}
        <SkeletonHeaderControls />
      </div>
      <div className="pb-5 md:pb-[22px]">
        {!backHref && <Skeleton className="h-[26px] w-40" />}
        <Skeleton className={cn("h-3 w-48", !backHref && "mt-1")} />
      </div>
    </>
  );
}

/** Espejo de HabitCheckRow (components/habit/habit-check-row.tsx), la fila
 * de hábitos de Hoy: avatar, nombre/subtítulo, racha, botón "···" y botón de
 * check — mismo gap-4/py-3.5 que la fila real. */
export function SkeletonHabitCheckRow() {
  return (
    <div className="flex items-center gap-4 border-b border-border py-3.5">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full md:h-[42px] md:w-[42px]" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="mt-0.5 h-2.5 w-24" />
      </div>
      <div className="shrink-0">
        <Skeleton className="ml-auto h-4 w-5" />
        <Skeleton className="mt-1 ml-auto h-2 w-6" />
      </div>
      <Skeleton className="h-3 w-3 shrink-0 rounded-sm" />
      <Skeleton className="h-6 w-6 shrink-0 rounded-full md:h-7 md:w-7" />
    </div>
  );
}

/** Espejo de la fila inline de HabitosClient (app/(dashboard)/habitos/habitos-client.tsx):
 * asa de arrastre, avatar más chico que el de Hoy, nombre/subtítulo y estado
 * a la derecha — mismo gap-2.5/py-3, deliberadamente distinta de
 * SkeletonHabitCheckRow porque la fila real también lo es. */
export function SkeletonHabitListRow() {
  return (
    <div className="flex items-center gap-2.5 border-b border-border py-3">
      <Skeleton className="h-3 w-3 shrink-0 rounded-sm" />
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-0.5 h-2.5 w-36" />
      </div>
      <Skeleton className="h-2.5 w-10 shrink-0" />
    </div>
  );
}

/** Tarjeta con borde redondeado (rounded-xl border p-4) que comparten
 * PeriodSummaryCard y StreakProgress en Estadísticas/detalle de hábito:
 * encabezado, cifra grande y `lines` renglones secundarios. */
export function SkeletonStatCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-6 w-16" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-32" />
      ))}
    </div>
  );
}

/** Espejo de las tarjetas de PatternsPanel (components/stats/patterns-panel.tsx). */
export function SkeletonPatternCard() {
  return (
    <div className="flex-1 rounded-xl border border-border p-3.5" style={{ minWidth: 180 }}>
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="mt-1.5 h-4 w-16" />
      <Skeleton className="mt-1 h-2.5 w-10" />
    </div>
  );
}

/** Espejo de un `Field` de HabitForm (components/habit/habit-form.tsx):
 * etiqueta uppercase + input, mismo gap-1.5. */
function SkeletonFormField({ width = "w-full" }: { width?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className={cn("h-10", width)} />
    </div>
  );
}

/** Espejo de HabitForm completo, usado en el detalle de hábito. Mismo
 * gap-5 entre campos que el formulario real; omite los campos condicionales
 * (según tipo de meta/frecuencia) porque varían por hábito. */
export function SkeletonHabitForm() {
  return (
    <div className="flex flex-col gap-5">
      <SkeletonFormField />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-2.5 w-20" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[30px] w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex gap-5">
        <SkeletonFormField width="flex-1" />
        <SkeletonFormField width="flex-1" />
      </div>
      <SkeletonFormField />
      <SkeletonFormField width="w-32" />
      <SkeletonFormField width="w-24" />
      <SkeletonFormField width="w-32" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-28 rounded-lg" />
    </div>
  );
}
