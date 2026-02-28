export const StatCard = ({
  label,
  value,
  hint
}: {
  label: string;
  value: string | number;
  hint?: string;
}) => {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </div>
  );
};
