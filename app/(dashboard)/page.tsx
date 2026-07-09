import { Suspense } from "react";
import { ContentHeader } from "@/components/nav/content-header";
import { DaySwitcher } from "@/components/habit/day-switcher";
import { HoySummaryProvider } from "@/components/habit/hoy-summary-context";
import { HoySummaryDisplay } from "@/components/habit/hoy-summary";
import { FocusCtaCard } from "@/components/focus/focus-cta-card";
import { SkeletonHoyRows } from "@/components/ui/skeleton";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { HoyHabits } from "./hoy-habits";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Solo se puede ver/registrar hoy o un día anterior — nunca el futuro. Una
 * fecha inválida o futura en el query cae de vuelta a hoy en silencio, en
 * vez de propagar el valor sucio hacia las queries. */
function resolveViewedDate(requested: string | undefined, today: string): string {
  if (requested && ISO_DATE.test(requested) && requested <= today) return requested;
  return today;
}

export default async function HoyPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha } = await searchParams;
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);
  const date = resolveViewedDate(fecha, today);

  return (
    <HoySummaryProvider>
      <div>
        <ContentHeader titleKey="screens.hoy.title" subtitleKey="screens.hoy.subtitle" />
        <DaySwitcher date={date} today={today} />
        {/* HoySummaryDisplay vive fuera del <Suspense>: al cambiar de día no
            se remonta, así que el % y la racha no cargan de nuevo — se
            quedan mostrando el valor del día anterior y transicionan al
            nuevo con scramble de texto una vez que HoyHabits los reporta. */}
        <HoySummaryDisplay />
        <div className="mb-4 md:mb-[22px]">
          <FocusCtaCard />
        </div>
        {/* key={date}: fuerza un límite de Suspense nuevo por cada fecha para
            que la lista de hábitos muestre el skeleton mientras carga en vez
            de dejar el contenido del día anterior congelado en pantalla. */}
        <Suspense key={date} fallback={<SkeletonHoyRows />}>
          <HoyHabits date={date} today={today} />
        </Suspense>
      </div>
    </HoySummaryProvider>
  );
}
