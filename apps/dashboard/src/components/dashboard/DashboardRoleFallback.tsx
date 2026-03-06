import { SkeletonCard, SkeletonChart, SkeletonList } from "@/components/ui/SkeletonBlocks";

export const DashboardRoleFallback = () => {
  return (
    <div className="page-wrap space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SkeletonChart />
        <SkeletonList rows={5} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonCard rows={3} />
        <SkeletonCard rows={3} />
        <SkeletonCard rows={3} />
      </div>
    </div>
  );
};
