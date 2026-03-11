import { StatusChip } from "@/components/ui/StatusChip";

export const StatusBadge = ({
  status,
  tone
}: {
  status: string;
  tone?: "success" | "warning" | "danger" | "info";
}) => {
  return <StatusChip label={status} tone={tone} compact />;
};
