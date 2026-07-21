import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";

export default function LogrosLoading() {
  return (
    <div>
      <SkeletonContentHeader backHref />
      <div className="flex flex-col gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-2 h-3.5 w-32" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-[62px] w-[72px] rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
