import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";

export default function FinanceRecurringLoading() {
  return (
    <div>
      <SkeletonContentHeader backHref />
      <Skeleton className="mb-4 h-10 w-full rounded-lg" />
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border py-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="mt-1 h-2.5 w-24" />
            </div>
            <Skeleton className="h-3.5 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
