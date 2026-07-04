import { Skeleton, SkeletonHabitRow, SkeletonHeader } from "@/components/ui/skeleton";

export default function HabitosLoading() {
  return (
    <div>
      <SkeletonHeader />
      <div className="flex flex-col">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonHabitRow key={i} />
        ))}
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
