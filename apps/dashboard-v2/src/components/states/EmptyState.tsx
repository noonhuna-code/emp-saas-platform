import { EmptyState as EmptyStateCore } from "@/components/ui/EmptyState";

export const EmptyState = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <EmptyStateCore title={title} subtitle={subtitle} />
);
