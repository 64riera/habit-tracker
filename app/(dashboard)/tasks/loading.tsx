import { Skeleton, SkeletonContentHeader, SkeletonTaskCheckRow } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div>
      <SkeletonContentHeader />
      <div className="mb-3 flex justify-end">
        <Skeleton className="h-[30px] w-28 rounded-full" />
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonTaskCheckRow key={i} />
        ))}
      </div>
    </div>
  );
}
