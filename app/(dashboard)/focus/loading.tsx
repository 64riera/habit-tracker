import { Skeleton, SkeletonContentHeader } from "@/components/ui/skeleton";

export default function FocusLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <SkeletonContentHeader backHref />
      <Skeleton className="mb-6 h-[110px] w-full rounded-xl" />
      <div className="mb-6 flex flex-col gap-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}
