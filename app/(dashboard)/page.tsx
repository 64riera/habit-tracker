import { Suspense } from "react";
import { ContentHeader } from "@/components/nav/content-header";
import { DaySwitcher } from "@/components/habit/day-switcher";
import { SkeletonHoyList } from "@/components/ui/skeleton";
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
    <div>
      <ContentHeader titleKey="screens.hoy.title" subtitleKey="screens.hoy.subtitle" />
      <DaySwitcher date={date} today={today} />
      {/* key={date}: fuerza un límite de Suspense nuevo por cada fecha para
          que el cambio de día muestre el skeleton mientras carga en vez de
          dejar el contenido del día anterior congelado en pantalla — el
          header y el switcher de arriba no dependen de esta consulta, así
          que siguen visibles y disponibles durante la carga. */}
      <Suspense key={date} fallback={<SkeletonHoyList />}>
        <HoyHabits date={date} today={today} />
      </Suspense>
    </div>
  );
}
