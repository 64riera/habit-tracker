"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { addDays, parseISODate } from "@/lib/date";
import { cn } from "@/lib/utils";

/**
 * Navega un día a la vez desde Hoy — nunca hacia el futuro (el botón
 * siguiente se oculta al llegar a hoy). Reutiliza el mismo mecanismo de
 * check-in parametrizado por fecha que ya existe (HabitCheckRow, LogEditor,
 * RoutineQuickActions ya reciben `date` y no distinguen si es hoy u otro
 * día), así que registrar hábitos de un día anterior es la misma UI de
 * siempre, solo con la fecha cambiada — sin pantalla ni formulario nuevos.
 *
 * `shownDate` es estado optimista: aunque este componente vive fuera del
 * <Suspense> que envuelve la lista de hábitos (page.tsx), sigue siendo
 * parte del árbol de Server Components — sin este estado, su propio texto
 * (label, flecha "siguiente", píldora "Volver a hoy") solo se actualizaría
 * después del round-trip al servidor, el mismo retraso visible que ya se
 * evitó para la lista. Al mantenerlo en estado de cliente, cambia en el
 * mismo tick del click; se resincroniza con la prop `date` cuando el
 * servidor confirma (por si se llegó por otra vía, como "atrás" del
 * navegador).
 */
export function DaySwitcher({ date, today }: { date: string; today: string }) {
  const { t, locale } = useI18n();
  const [shownDate, setShownDate] = useState(date);
  // Resincroniza durante el render (no en un efecto) si la prop confirmada
  // por el servidor cambió por otra vía que no fue un click acá (link
  // directo, "atrás" del navegador) — el patrón recomendado por React para
  // derivar estado de una prop sin el frame extra de un useEffect.
  const [syncedDate, setSyncedDate] = useState(date);
  if (date !== syncedDate) {
    setSyncedDate(date);
    setShownDate(date);
  }

  const isToday = shownDate === today;
  const prev = addDays(shownDate, -1);
  const next = addDays(shownDate, 1);

  const label = isToday
    ? t("checkin.today")
    : new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(parseISODate(shownDate));

  return (
    <div className="mb-4 flex items-center gap-1 md:mb-5">
      <Link
        href={`/?fecha=${prev}`}
        onClick={() => setShownDate(prev)}
        aria-label={t("checkin.previousDay")}
        className="-m-2 shrink-0 rounded-full p-2 text-muted"
      >
        <ChevronLeft size={15} strokeWidth={2.2} aria-hidden />
      </Link>

      <div className={cn("font-serif-italic text-[13px]", !isToday && "text-muted")}>{label}</div>

      {!isToday && (
        <Link
          href="/"
          onClick={() => setShownDate(today)}
          className="ml-1.5 shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted"
        >
          {t("checkin.backToToday")}
        </Link>
      )}

      {!isToday && (
        <Link
          href={`/?fecha=${next}`}
          onClick={() => setShownDate(next)}
          aria-label={t("checkin.nextDay")}
          className="-m-2 ml-auto shrink-0 rounded-full p-2 text-muted"
        >
          <ChevronRight size={15} strokeWidth={2.2} aria-hidden />
        </Link>
      )}
    </div>
  );
}
