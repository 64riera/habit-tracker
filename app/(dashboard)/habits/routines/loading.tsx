import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";

export default function RutinasLoading() {
  return (
    <div>
      <SkeletonContentHeader backHref />
      <div className="mb-3 flex justify-end">
        <Skeleton className="h-[30px] w-28 rounded-full" />
      </div>
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 border-b border-border py-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="mt-1 h-2.5 w-36" />
            </div>
            <Skeleton className="h-3 w-10 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
