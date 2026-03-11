export const EmptyState = ({
  title,
  subtitle,
  compact = false
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
}) => (
  <div className={`empty-state ${compact ? "empty-state--compact" : ""}`}>
    <h3>{title}</h3>
    {subtitle ? <p className="muted">{subtitle}</p> : null}
  </div>
);
