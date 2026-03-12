import { LoaderCircle } from "lucide-react";
import { StatePanel } from "@/components/dashboard-v2/PagePrimitives";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export const LoadingState = ({
  label = "Loading...",
  description = "Preparing the latest data for this workspace."
}: {
  label?: string;
  description?: string;
}) => (
  <StatePanel title={label} description={description}>
    <div className="space-y-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Syncing route data
      </div>
      <SkeletonLoader rows={4} />
    </div>
  </StatePanel>
);
