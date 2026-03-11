"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPayrollGrowthMetrics } from "@/lib/client/api";
import type { PayrollGrowthMetricsResponse } from "@/lib/types/payroll";
import type { DashboardWidget } from "@/lib/dashboard/dashboard-widget-capabilities";
import { DashboardPanel, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  EmptyLabel,
  WidgetSkeleton,
  formatCurrency,
  formatPercent,
  type PayrollAnalyticsWidgetRangeMonths
} from "./_shared";

export const payrollGrowthWidgetKey: DashboardWidget = "payroll_growth";

export const PayrollGrowthWidget = ({ months = 12 }: { months?: PayrollAnalyticsWidgetRangeMonths }) => {
  const [data, setData] = useState<PayrollGrowthMetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchPayrollGrowthMetrics({ months })
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load payroll growth metrics");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load payroll growth metrics");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [months]);

  const trend = useMemo(() => {
    const delta = data?.absoluteDelta ?? 0;
    if (delta > 0) return { arrow: "↑", tone: "warning" as const };
    if (delta < 0) return { arrow: "↓", tone: "success" as const };
    return { arrow: "→", tone: "info" as const };
  }, [data]);

  return (
    <DashboardPanel title="MoM payroll growth" subtitle={`Net payroll month-over-month change (${months}m trend basis)`} tone="spotlight">
      {loading ? <WidgetSkeleton rows={4} /> : null}
      {!loading && error ? <EmptyLabel message={error} /> : null}
      {!loading && !error && !data ? <EmptyLabel message="No payroll growth metrics available." /> : null}
      {!loading && !error && data ? (
        <>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="stack" style={{ gap: 2 }}>
              <span className="muted" style={{ fontSize: 12 }}>Percent growth</span>
              <strong style={{ fontSize: 24 }}>{trend.arrow} {formatPercent(data.percentGrowth, 2)}</strong>
            </div>
            <StatusBadge
              status={trend.tone === "warning" ? "Growth" : trend.tone === "success" ? "Reduced" : "Flat"}
              tone={trend.tone}
            />
          </div>
          <SignalRow label="Current month net" value={formatCurrency(data.currentMonthNet)} tone="info" />
          <SignalRow label="Previous month net" value={formatCurrency(data.previousMonthNet)} />
          <SignalRow
            label="Absolute delta"
            value={formatCurrency(data.absoluteDelta)}
            tone={data.absoluteDelta > 0 ? "warning" : data.absoluteDelta < 0 ? "success" : "info"}
          />
        </>
      ) : null}
    </DashboardPanel>
  );
};
