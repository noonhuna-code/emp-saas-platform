import { StatusChip } from "@/components/ui/StatusChip";

export const CompanyContextBadge = ({ companyId, role }: { companyId: string | null; role: string | null }) => {
  const value = companyId ? `${role ?? "unknown"} · ${companyId.slice(0, 8)}...` : `${role ?? "unknown"} · no company`;
  return <StatusChip label={value} compact tone="default" />;
};
