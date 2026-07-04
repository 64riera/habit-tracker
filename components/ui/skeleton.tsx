import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-border/70", className)} />;
}

export function SkeletonHeader() {
  return (
    <div className="mb-5 flex items-start justify-between gap-4 md:mb-[22px]">
      <div>
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-2 h-3 w-48" />
      </div>
      <Skeleton className="h-7 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonHabitRow() {
  return (
    <div className="flex items-center gap-4 border-b border-border py-3.5">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full md:h-[42px] md:w-[42px]" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="mt-2 h-2.5 w-24" />
      </div>
      <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
    </div>
  );
}
