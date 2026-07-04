import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function HistorialLoading() {
  return (
    <div>
      <SkeletonHeader />
      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
