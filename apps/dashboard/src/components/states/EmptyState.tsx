export const EmptyState = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="card stack">
    <h2>{title}</h2>
    {subtitle ? <p className="muted">{subtitle}</p> : null}
  </div>
);
