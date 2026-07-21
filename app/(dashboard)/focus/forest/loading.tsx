import { Skeleton, SkeletonContentHeader, SkeletonStatCard } from "@/components/ui/skeleton";

export default function BosqueLoading() {
  return (
    <div>
      <SkeletonContentHeader backHref />
      <div className="mb-5 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[30px] w-16 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="mb-2.5 h-2.5 w-32" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        </div>
        <SkeletonStatCard />
        <div>
          <Skeleton className="mb-2 h-2.5 w-28" />
          <Skeleton className="h-[140px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
