import type { CSSProperties } from "react";

export const MiniBarChart = ({
  values,
  height = 48
}: {
  values: number[];
  height?: number;
}) => {
  const max = Math.max(1, ...values);
  return (
    <div className="mini-chart" style={{ height }}>
      {values.map((value, index) => {
        const barHeight = Math.max(4, Math.round((value / max) * height));
        const style: CSSProperties = { height: barHeight };
        return <span key={index} style={style} />;
      })}
    </div>
  );
};

export const Donut = ({ value }: { value: number }) => {
  const radius = 24;
  const stroke = 6;
  const normalized = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <svg className="donut" viewBox="0 0 64 64">
      <circle className="donut__bg" cx="32" cy="32" r={radius} strokeWidth={stroke} />
      <circle
        className="donut__meter"
        cx="32"
        cy="32"
        r={radius}
        strokeWidth={stroke}
        style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
      />
      <text x="32" y="36" textAnchor="middle" className="donut__label">
        {normalized}%
      </text>
    </svg>
  );
};

export const LineChart = ({
  values,
  height = 72,
  stroke = "var(--color-accent, #2f7cff)"
}: {
  values: number[];
  height?: number;
  stroke?: string;
}) => {
  const width = 240;
  const safeValues = values.length > 0 ? values : [0];
  const max = Math.max(1, ...safeValues);
  const min = Math.min(...safeValues);
  const range = Math.max(1, max - min);

  const points = safeValues.map((value, index) => {
    const x = safeValues.length === 1 ? width / 2 : (index / (safeValues.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 8) - 4;
    return `${x},${Number.isFinite(y) ? y : height / 2}`;
  });

  const polyline = points.join(" ");
  const area = `0,${height} ${polyline} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} aria-hidden="true">
      <defs>
        <linearGradient id="chartLineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={area}
        fill="url(#chartLineFill)"
        stroke="none"
      />
      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {safeValues.map((value, index) => {
        const x = safeValues.length === 1 ? width / 2 : (index / (safeValues.length - 1)) * width;
        const y = height - ((value - min) / range) * (height - 8) - 4;
        return <circle key={`${index}-${value}`} cx={x} cy={y} r={1.75} fill={stroke} />;
      })}
    </svg>
  );
};
