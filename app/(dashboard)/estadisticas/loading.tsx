import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function EstadisticasLoading() {
  return (
    <div>
      <SkeletonHeader />
      <div className="flex flex-col gap-6">
        <div className="flex gap-4 md:gap-[22px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1">
              <Skeleton className="h-8 w-14" />
              <Skeleton className="mt-2 h-2.5 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
