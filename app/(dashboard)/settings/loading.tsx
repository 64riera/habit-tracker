import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";

export default function AjustesLoading() {
  return (
    <div>
      <SkeletonContentHeader />
      <div className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-border py-3.5">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between border-b border-border py-3.5">
            <div>
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-1 h-2.5 w-32" />
            </div>
            <Skeleton className="h-[26px] w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
