const STATUS_STYLES: Record<string, string> = {
  pending: "badge badge--amber",
  sent: "badge badge--green",
  failed: "badge badge--red",
  approved: "badge badge--green",
  rejected: "badge badge--red",
  draft: "badge badge--info",
  processing: "badge badge--amber",
  calculated: "badge badge--info",
  finalized: "badge badge--green",
  paid: "badge badge--green",
  archived: "badge badge--warning",
  partial: "badge badge--warning",
  locked: "badge badge--green",
  unlocked: "badge badge--amber",
  active: "badge badge--green",
  suspended: "badge badge--amber",
  terminated: "badge badge--red"
};

export const StatusBadge = ({
  status,
  tone
}: {
  status: string;
  tone?: "success" | "warning" | "danger" | "info";
}) => {
  const key = status?.toLowerCase() ?? "default";
  const className = tone
    ? `badge badge--${tone}`
    : STATUS_STYLES[key] ?? "badge";
  return <span className={className}>{status}</span>;
};
