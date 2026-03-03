type StatusTone = "default" | "success" | "warning" | "danger" | "info";

const STATUS_TONE_MAP: Record<string, StatusTone> = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  canceled: "danger",
  paid: "success",
  overdue: "warning",
  pending: "warning",
  failed: "danger",
  approved: "success",
  rejected: "danger"
};

export const StatusChip = ({
  label,
  tone,
  compact = false
}: {
  label: string;
  tone?: StatusTone;
  compact?: boolean;
}) => {
  const normalized = label.toLowerCase();
  const resolvedTone = tone ?? STATUS_TONE_MAP[normalized] ?? "default";
  return (
    <span className={`status-chip status-chip--${resolvedTone} ${compact ? "status-chip--compact" : ""}`}>
      {label}
    </span>
  );
};
