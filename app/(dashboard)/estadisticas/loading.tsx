import {
  Skeleton,
  SkeletonContentHeader,
  SkeletonPatternCard,
  SkeletonStatCard,
} from "@/components/ui/skeleton";

export default function EstadisticasLoading() {
  return (
    <div>
      <SkeletonContentHeader />

      <div className="flex flex-col gap-6">
        <div className="flex">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-l border-border px-4 first:border-l-0 first:pl-0 md:px-[22px]"
            >
              <Skeleton className="h-6 w-12 md:h-[30px]" />
              <Skeleton className="mt-1 h-2.5 w-16" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SkeletonStatCard lines={2} />
          <SkeletonStatCard lines={1} />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <SkeletonPatternCard />
          <SkeletonPatternCard />
        </div>

        <div>
          <Skeleton className="mb-2.5 h-2.5 w-16" />
          <div className="flex h-16 items-end gap-1.5">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-3.5 shrink-0 rounded-t-[3px]"
                style={{ height: `${30 + ((i * 13) % 60)}%` }}
              />
            ))}
          </div>
        </div>

        <div>
          <Skeleton className="mb-2.5 h-2.5 w-24" />
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-[88px] shrink-0" />
                <Skeleton className="h-1.5 flex-1 rounded-full" />
                <Skeleton className="h-2.5 w-8 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border py-2.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
