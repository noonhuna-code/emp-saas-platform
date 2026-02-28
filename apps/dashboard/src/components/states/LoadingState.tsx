export const LoadingState = ({
  label = "Loading..."
}: {
  label?: string;
}) => (
  <div className="card stack">
    <p className="muted">{label}</p>
    <div className="loading-skeleton-grid" aria-hidden="true">
      <div className="loading-skeleton loading-skeleton--lg" />
      <div className="loading-skeleton loading-skeleton--md" />
      <div className="loading-skeleton loading-skeleton--sm" />
      <div className="loading-skeleton loading-skeleton--md" />
    </div>
  </div>
);

