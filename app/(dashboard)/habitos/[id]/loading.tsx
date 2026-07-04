import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function HabitoDetalleLoading() {
  return (
    <div>
      <SkeletonHeader />
      <div className="mb-5 flex flex-col gap-3">
        <Skeleton className="h-9 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
