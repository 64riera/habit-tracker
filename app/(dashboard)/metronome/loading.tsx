import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";

export default function MetronomoLoading() {
  return (
    <div>
      <SkeletonContentHeader />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[220px] w-full rounded-xl" />
        <Skeleton className="h-[120px] w-full rounded-xl" />
      </div>
    </div>
  );
}
