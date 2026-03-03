import { MetricCard } from "@/components/ui/MetricCard";

export const StatCard = ({
  label,
  value,
  hint
}: {
  label: string;
  value: string | number;
  hint?: string;
}) => {
  return <MetricCard label={label} value={value} hint={hint} />;
};
