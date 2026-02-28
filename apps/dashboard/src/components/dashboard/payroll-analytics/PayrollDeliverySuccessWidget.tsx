"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { fetchPayrollDeliveryMetrics } from "@/lib/client/api";
import type { PayrollDeliveryMetricsPoint } from "@/lib/types/payroll";
import type { DashboardWidget } from "@/lib/dashboard/dashboard-widget-capabilities";
import { DashboardPanel, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import {
  EmptyLabel,
  WidgetSkeleton,
  formatMonthLabel,
  formatPercent,
  type PayrollAnalyticsWidgetRangeMonths
} from "./_shared";

const LazyDonut = dynamic(() => import("@/components/shared/Charts").then((mod) => mod.Donut), {
  ssr: false,
  loading: () => <WidgetSkeleton rows={2} />
});

export const payrollDeliverySuccessWidgetKey: DashboardWidget = "payroll_delivery_success";

export const PayrollDeliverySuccessWidget = ({ months = 12 }: { months?: PayrollAnalyticsWidgetRangeMonths }) => {
  const [rows, setRows] = useState<PayrollDeliveryMetricsPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchPayrollDeliveryMetrics({ months })
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load payroll delivery metrics");
          return;
        }
        setRows(result.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load payroll delivery metrics");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [months]);

  const aggregate = useMemo(() => {
    const source = rows ?? [];
    const sent = source.reduce((acc, row) => acc + row.sent, 0);
    const failed = source.reduce((acc, row) => acc + row.failed, 0);
    const pending = source.reduce((acc, row) => acc + row.pending, 0);
    const totalDispatches = source.reduce((acc, row) => acc + row.totalDispatches, 0);
    const totalLatest = sent + failed + pending;
    const successRate = totalLatest === 0 ? 0 : Number(((sent / totalLatest) * 100).toFixed(2));
    const failedRate = totalLatest === 0 ? 0 : Number(((failed / totalLatest) * 100).toFixed(2));
    const lastUpdatedAt = source
      .map((row) => row.lastActivityAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
    return { sent, failed, pending, totalDispatches, successRate, failedRate, lastUpdatedAt };
  }, [rows]);

  return (
    <DashboardPanel title="Payslip delivery success" subtitle={`Latest-state dispatch outcomes (${months}m)`} tone="soft">
      {loading ? <WidgetSkeleton rows={4} /> : null}
      {!loading && error ? <EmptyLabel message={error} /> : null}
      {!loading && !error && (!rows || rows.length === 0) ? <EmptyLabel message="No delivery dispatch activity available." /> : null}
      {!loading && !error && rows && rows.length > 0 ? (
        <>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="stack" style={{ gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>Success rate</span>
              <strong style={{ fontSize: 22 }}>{formatPercent(aggregate.successRate, 1)}</strong>
            </div>
            <LazyDonut value={aggregate.successRate} />
          </div>
          <SignalRow label="Failed rate" value={formatPercent(aggregate.failedRate, 1)} tone={aggregate.failed > 0 ? "warning" : "success"} />
          <SignalRow label="Pending backlog" value={aggregate.pending} tone={aggregate.pending > 0 ? "warning" : "success"} />
          <SignalRow label="Total dispatch attempts" value={aggregate.totalDispatches} />
          <SignalRow label="Last updated" value={aggregate.lastUpdatedAt ?? "-"} />
          <div className="stack" style={{ gap: 6 }}>
            {rows.slice(-3).map((row) => (
              <SignalRow
                key={row.runId}
                label={formatMonthLabel(row.year, row.month)}
                value={`${formatPercent(row.successRate, 1)} | sent ${row.sent} / fail ${row.failed} / pending ${row.pending}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </DashboardPanel>
  );
};
