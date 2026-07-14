import { Skeleton, SkeletonContentHeader, SkeletonStatCard, SkeletonPatternCard } from "@/components/ui/skeleton";

export default function FocusEstadisticasLoading() {
  return (
    <div>
      <SkeletonContentHeader backHref />
      <div className="mb-5 flex gap-2">
        <Skeleton className="h-[30px] w-28 rounded-full" />
        <Skeleton className="h-[30px] w-28 rounded-full" />
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="mb-2 h-2.5 w-20" />
          <Skeleton className="h-[140px] w-full rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <div className="flex flex-wrap gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonPatternCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
