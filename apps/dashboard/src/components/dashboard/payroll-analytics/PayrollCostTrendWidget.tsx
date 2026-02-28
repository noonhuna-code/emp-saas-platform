"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { fetchPayrollCostTrend } from "@/lib/client/api";
import type { PayrollCostTrendPoint } from "@/lib/types/payroll";
import type { DashboardWidget } from "@/lib/dashboard/dashboard-widget-capabilities";
import { DashboardPanel, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import {
  EmptyLabel,
  WidgetSkeleton,
  formatCurrency,
  formatMonthLabel,
  formatPercent,
  type PayrollAnalyticsWidgetRangeMonths
} from "./_shared";

const LazyLineChart = dynamic(() => import("@/components/shared/Charts").then((mod) => mod.LineChart), {
  ssr: false,
  loading: () => <WidgetSkeleton rows={2} />
});

export const payrollCostTrendWidgetKey: DashboardWidget = "payroll_trend";

export const PayrollCostTrendWidget = ({ months = 12 }: { months?: PayrollAnalyticsWidgetRangeMonths }) => {
  const [rows, setRows] = useState<PayrollCostTrendPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchPayrollCostTrend({ months })
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load payroll cost trend");
          return;
        }
        setRows(result.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load payroll cost trend");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [months]);

  const latest = useMemo(() => rows?.at(-1) ?? null, [rows]);
  const previous = useMemo(() => (rows && rows.length > 1 ? rows[rows.length - 2] : null), [rows]);
  const chartValues = useMemo(() => (rows ?? []).map((row) => row.netTotal), [rows]);

  return (
    <DashboardPanel title="Payroll cost trend" subtitle={`Net payroll trend (last ${months} months)`} tone="spotlight">
      {loading ? <WidgetSkeleton rows={4} /> : null}
      {!loading && error ? <EmptyLabel message={error} /> : null}
      {!loading && !error && (!rows || rows.length === 0) ? <EmptyLabel message="No paid payroll runs available for trend analysis." /> : null}
      {!loading && !error && rows && rows.length > 0 ? (
        <>
          <div className="stack" style={{ gap: 8 }}>
            <SignalRow label="Current month" value={latest ? formatMonthLabel(latest.year, latest.month) : "-"} tone="info" />
            <SignalRow label="Net total" value={latest ? formatCurrency(latest.netTotal) : "-"} tone="success" />
            <SignalRow
              label="MoM change"
              value={latest ? `${formatCurrency(latest.deltaFromPrevious ?? 0)} (${formatPercent(latest.percentGrowth, 2)})` : "-"}
              tone={(latest?.deltaFromPrevious ?? 0) < 0 ? "warning" : "success"}
            />
            {previous ? <SignalRow label="Previous month net" value={formatCurrency(previous.netTotal)} /> : null}
          </div>
          <LazyLineChart values={chartValues} height={88} />
          <div className="stack" style={{ gap: 6 }}>
            {rows.slice(-4).map((row) => (
              <SignalRow
                key={`${row.year}-${row.month}`}
                label={formatMonthLabel(row.year, row.month)}
                value={`${formatCurrency(row.netTotal)} | Gross ${formatCurrency(row.grossTotal)}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </DashboardPanel>
  );
};
