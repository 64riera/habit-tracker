import { Skeleton, SkeletonContentHeader, SkeletonHabitForm, SkeletonStatCard } from "@/components/ui/skeleton";

export default function HabitoDetalleLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <SkeletonContentHeader backHref />

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <SkeletonStatCard lines={2} />
        <SkeletonStatCard lines={1} />
      </div>

      <SkeletonHabitForm />

      <div className="mt-2">
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
