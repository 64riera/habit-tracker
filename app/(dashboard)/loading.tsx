import { SkeletonContentHeader, SkeletonHoyList } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <SkeletonContentHeader />
      <SkeletonHoyList />
    </div>
  );
}
