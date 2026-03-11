export default function Loading() {
  return (
    <div className="page-wrap space-y-6">
      <div className="loading-skeleton-grid">
        <div className="loading-skeleton loading-skeleton--lg"></div>
        <div className="loading-skeleton loading-skeleton--md"></div>
        <div className="loading-skeleton loading-skeleton--sm"></div>
      </div>
      <div className="loading-skeleton-grid">
        <div className="loading-skeleton loading-skeleton--lg"></div>
        <div className="loading-skeleton loading-skeleton--lg"></div>
        <div className="loading-skeleton loading-skeleton--lg"></div>
      </div>
    </div>
  );
}
