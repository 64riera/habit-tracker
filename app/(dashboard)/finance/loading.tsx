import { Skeleton, SkeletonContentHeader, SkeletonTransactionRow } from "@/components/ui/skeleton";

export default function FinanceLoading() {
  return (
    <div>
      <SkeletonContentHeader />

      <div className="mb-5 flex gap-2">
        {["w-14", "w-14", "w-16", "w-14", "w-16"].map((w, i) => (
          <Skeleton key={i} className={`h-[30px] rounded-full ${w}`} />
        ))}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border px-3 py-3">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="mt-1.5 h-4 w-16" />
          </div>
        ))}
      </div>

      <Skeleton className="mb-6 h-11 w-full rounded-xl" />

      <Skeleton className="mb-2.5 h-2.5 w-20" />
      <div className="mb-3 flex flex-col">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonTransactionRow key={i} />
        ))}
      </div>
    </div>
  );
}
