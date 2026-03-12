import { AlertTriangle } from "lucide-react";
import { StatePanel } from "@/components/dashboard-v2/PagePrimitives";

export const ErrorState = ({ message }: { message: string }) => (
  <StatePanel title="Unable to load" description="This section could not be rendered with the current response.">
    <div className="inline-flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  </StatePanel>
);
