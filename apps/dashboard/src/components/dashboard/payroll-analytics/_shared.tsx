"use client";

import { useMemo, useState } from "react";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

export const formatMonthLabel = (year: number, month: number) => `${String(month).padStart(2, "0")}/${year}`;

export const formatPercent = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return `${value.toFixed(digits)}%`;
};

export const WidgetSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="stack" style={{ gap: 10 }} aria-hidden="true">
    {Array.from({ length: rows }).map((_, idx) => (
      <div
        key={idx}
        style={{
          height: idx === 0 ? 18 : 12,
          width: idx === 0 ? "42%" : `${88 - idx * 10}%`,
          borderRadius: 8,
          background: "linear-gradient(90deg, rgba(148,163,184,0.22), rgba(148,163,184,0.08), rgba(148,163,184,0.22))"
        }}
      />
    ))}
  </div>
);

export const EmptyLabel = ({ message }: { message: string }) => (
  <p className="muted">{message}</p>
);

export const PAYROLL_ANALYTICS_RANGE_OPTIONS = [3, 6, 12, 24] as const;
export type PayrollAnalyticsWidgetRangeMonths = (typeof PAYROLL_ANALYTICS_RANGE_OPTIONS)[number];

export const usePayrollAnalyticsRange = (initialMonths: PayrollAnalyticsWidgetRangeMonths = 12) => {
  const [months, setMonths] = useState<PayrollAnalyticsWidgetRangeMonths>(initialMonths);
  const label = useMemo(() => `${months}m`, [months]);
  return { months, setMonths, label };
};

export const PayrollAnalyticsRangePicker = ({
  months,
  onChange
}: {
  months: PayrollAnalyticsWidgetRangeMonths;
  onChange: (value: PayrollAnalyticsWidgetRangeMonths) => void;
}) => {
  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {PAYROLL_ANALYTICS_RANGE_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={option === months ? "primary-btn" : "secondary-btn"}
          style={{ minWidth: 52 }}
          aria-pressed={option === months}
        >
          {option}m
        </button>
      ))}
    </div>
  );
};
