import { Skeleton, SkeletonHabitRow, SkeletonHeader } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <SkeletonHeader />
      <div className="flex flex-col gap-4 md:gap-[22px]">
        <div>
          <Skeleton className="h-9 w-20" />
          <Skeleton className="mt-2.5 h-0.5 w-full md:mt-3" />
        </div>
        <div className="flex flex-col">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonHabitRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
