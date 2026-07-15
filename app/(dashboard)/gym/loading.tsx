import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";

export default function GymLoading() {
  return (
    <div>
      <SkeletonContentHeader />

      <Skeleton className="mt-3 mb-1.5 h-3.5 w-24" />
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border py-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="mt-1.5 h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[42px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
