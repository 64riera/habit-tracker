import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";

export default function FocusHistoriaLoading() {
  return (
    <div>
      <SkeletonContentHeader backHref />
      <div className="mb-5 flex gap-2">
        <Skeleton className="h-[30px] w-28 rounded-full" />
        <Skeleton className="h-[30px] w-28 rounded-full" />
      </div>
      <div className="mb-8 flex">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 border-l border-border px-4 first:border-l-0 first:pl-0 md:px-[22px]">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="mt-1.5 h-2.5 w-20" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-1.5 h-4 w-24" />
            <div className="flex flex-col">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2.5 border-b border-border py-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
