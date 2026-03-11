export const SkeletonLoader = ({
  rows = 4
}: {
  rows?: number;
}) => {
  return (
    <div className="skeleton-loader" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={`skeleton-loader__row skeleton-loader__row--${index % 3}`} />
      ))}
    </div>
  );
};
