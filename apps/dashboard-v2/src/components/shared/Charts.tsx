import { useId, type CSSProperties } from "react";

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
  const gradientId = useId();
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
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={area}
        fill={`url(#${gradientId})`}
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

export const StackedBarChart = ({
  rows,
  height = 88
}: {
  rows: Array<{ label: string; a: number; b: number; c?: number }>;
  height?: number;
}) => {
  const maxTotal = Math.max(1, ...rows.map((row) => row.a + row.b + (row.c ?? 0)));

  return (
    <div className="stacked-bars" style={{ minHeight: height }}>
      {rows.map((row) => {
        const total = row.a + row.b + (row.c ?? 0);
        const segA = Math.max(2, (row.a / maxTotal) * 100);
        const segB = Math.max(2, (row.b / maxTotal) * 100);
        const segC = row.c ? Math.max(2, (row.c / maxTotal) * 100) : 0;

        return (
          <div key={row.label} className="stacked-bars__row">
            <span className="stacked-bars__label">{row.label}</span>
            <div className="stacked-bars__track" aria-label={`${row.label}: ${total}`}>
              <span className="stacked-bars__seg stacked-bars__seg--a" style={{ width: `${segA}%` }} />
              <span className="stacked-bars__seg stacked-bars__seg--b" style={{ width: `${segB}%` }} />
              {segC > 0 ? <span className="stacked-bars__seg stacked-bars__seg--c" style={{ width: `${segC}%` }} /> : null}
            </div>
            <span className="stacked-bars__value">{total}</span>
          </div>
        );
      })}
    </div>
  );
};

export const SplitDonut = ({
  a,
  b,
  labels = ["A", "B"]
}: {
  a: number;
  b: number;
  labels?: [string, string];
}) => {
  const radius = 24;
  const stroke = 6;
  const total = Math.max(1, a + b);
  const circumference = 2 * Math.PI * radius;
  const firstArc = (a / total) * circumference;
  const secondArc = circumference - firstArc;

  return (
    <div className="split-donut">
      <svg className="donut" viewBox="0 0 64 64" aria-hidden="true">
        <circle className="donut__bg" cx="32" cy="32" r={radius} strokeWidth={stroke} />
        <circle
          className="split-donut__a"
          cx="32"
          cy="32"
          r={radius}
          strokeWidth={stroke}
          style={{ strokeDasharray: `${firstArc} ${secondArc}`, strokeDashoffset: 0 }}
        />
        <circle
          className="split-donut__b"
          cx="32"
          cy="32"
          r={radius}
          strokeWidth={stroke}
          style={{ strokeDasharray: `${secondArc} ${firstArc}`, strokeDashoffset: -firstArc }}
        />
      </svg>
      <div className="split-donut__legend">
        <span><i className="split-donut__dot split-donut__dot--a" />{labels[0]} {a}</span>
        <span><i className="split-donut__dot split-donut__dot--b" />{labels[1]} {b}</span>
      </div>
    </div>
  );
};
