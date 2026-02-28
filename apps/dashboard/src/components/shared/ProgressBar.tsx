export const ProgressBar = ({ value }: { value: number }) => {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="progress">
      <div className="progress__bar" style={{ width: `${safe}%` }} />
      <span className="progress__label">{safe}%</span>
    </div>
  );
};
