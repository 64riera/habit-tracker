import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";

export default function GymRoutinesLoading() {
  return (
    <div>
      <SkeletonContentHeader backHref />
      <Skeleton className="mb-4 h-10 w-full rounded-lg" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-3.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
              <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-2.5 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
