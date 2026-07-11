import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Anchos de los 5 filtros reales (hábito, categoría, rango, CSV, JSON) — ver
// historial-client.tsx.
const FILTER_WIDTHS = ["w-24", "w-28", "w-20", "w-20", "w-20"];

export default function HistorialLoading() {
  return (
    <div>
      <SkeletonContentHeader />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_WIDTHS.map((w, i) => (
          <Skeleton key={i} className={cn("h-[30px] rounded-full", w)} />
        ))}
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <Skeleton className="mb-2 h-2.5 w-20" />
          <Skeleton className="h-[95px] w-full rounded-lg" />
        </div>

        <div>
          <Skeleton className="mb-2 h-2.5 w-24" />
          <Skeleton className="h-[220px] w-full rounded-lg" />
        </div>

        <div>
          <Skeleton className="mb-2 h-2.5 w-16" />
          <div className="flex flex-col">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-baseline gap-3 border-b border-border py-2.5">
                <Skeleton className="h-2.5 w-14 shrink-0" />
                <Skeleton className="h-3 w-24 shrink-0" />
                <Skeleton className="h-2.5 w-14 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
