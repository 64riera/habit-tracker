import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";

export default function FinanceBudgetsLoading() {
  return (
    <div>
      <SkeletonContentHeader backHref />
      <div className="mt-4 flex flex-col gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border py-3">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
