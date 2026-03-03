import type { ReactNode } from "react";

export const MetricCard = ({
  label,
  value,
  hint,
  trend,
  accent = "default",
  footer
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
  accent?: "default" | "success" | "warning" | "danger" | "info";
  footer?: ReactNode;
}) => {
  return (
    <article className={`metric-card metric-card--${accent}`}>
      <header className="metric-card__head">
        <span className="metric-card__label">{label}</span>
        {trend ? <span className="metric-card__trend">{trend}</span> : null}
      </header>
      <strong className="metric-card__value">{value}</strong>
      {hint ? <p className="metric-card__hint">{hint}</p> : null}
      {footer ? <div className="metric-card__footer">{footer}</div> : null}
    </article>
  );
};
