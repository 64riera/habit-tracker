import { Skeleton, SkeletonContentHeader, SkeletonStatCard } from "@/components/ui/skeleton";

export default function GymEstadisticasLoading() {
  return (
    <div>
      <SkeletonContentHeader backHref />
      <div className="flex flex-col gap-6">
        <div className="flex">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 px-4 first:pl-0 md:px-[22px]">
              <Skeleton className="h-2.5 w-10" />
              <Skeleton className="mt-1.5 h-5 w-8" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <div>
          <Skeleton className="mb-2 h-2.5 w-24" />
          <Skeleton className="h-[140px] w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border py-3">
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3.5 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
