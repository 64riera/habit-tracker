import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";

export default function GymExercisesLoading() {
  return (
    <div>
      <SkeletonContentHeader backHref />
      <Skeleton className="mb-4 h-10 w-full rounded-lg" />
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border py-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="mt-1 h-2.5 w-20" />
            </div>
            <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
            <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
