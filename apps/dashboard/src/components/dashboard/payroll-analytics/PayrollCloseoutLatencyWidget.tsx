"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { fetchPayrollCloseoutLatency } from "@/lib/client/api";
import type { PayrollCloseoutLatencyResponse } from "@/lib/types/payroll";
import type { DashboardWidget } from "@/lib/dashboard/dashboard-widget-capabilities";
import { DashboardPanel, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import {
  EmptyLabel,
  WidgetSkeleton,
  formatMonthLabel,
  type PayrollAnalyticsWidgetRangeMonths
} from "./_shared";

const LazyMiniBarChart = dynamic(() => import("@/components/shared/Charts").then((mod) => mod.MiniBarChart), {
  ssr: false,
  loading: () => <WidgetSkeleton rows={2} />
});

export const payrollCloseoutLatencyWidgetKey: DashboardWidget = "payroll_closeout_latency";

export const PayrollCloseoutLatencyWidget = ({ months = 12 }: { months?: PayrollAnalyticsWidgetRangeMonths }) => {
  const [data, setData] = useState<PayrollCloseoutLatencyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchPayrollCloseoutLatency({ months })
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load payroll closeout latency");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load payroll closeout latency");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [months]);

  const finalizeBars = useMemo(
    () => (data?.rows ?? []).map((row) => Math.max(0, row.finalizeToPaidHours ?? 0)).slice(-8),
    [data]
  );

  const latestRows = useMemo(() => (data?.rows ?? []).slice(-4).reverse(), [data]);
  const latencyAlert = (data?.summary.avgFinalizeToPaid ?? 0) > 48;

  return (
    <DashboardPanel title="Payroll closeout latency" subtitle={`Finalize → Paid and Paid → Archived (${months}m)`} tone="soft">
      {loading ? <WidgetSkeleton rows={4} /> : null}
      {!loading && error ? <EmptyLabel message={error} /> : null}
      {!loading && !error && (!data || data.rows.length === 0) ? <EmptyLabel message="No paid payroll runs with closeout timestamps available." /> : null}
      {!loading && !error && data && data.rows.length > 0 ? (
        <>
          <SignalRow label="Avg finalize → paid" value={data.summary.avgFinalizeToPaid !== null ? `${data.summary.avgFinalizeToPaid}h` : "-"} tone={latencyAlert ? "warning" : "success"} />
          <SignalRow label="P50 finalize → paid" value={data.summary.p50FinalizeToPaid !== null ? `${data.summary.p50FinalizeToPaid}h` : "-"} />
          <SignalRow label="P95 finalize → paid" value={data.summary.p95FinalizeToPaid !== null ? `${data.summary.p95FinalizeToPaid}h` : "-"} tone={latencyAlert ? "warning" : "info"} />
          <SignalRow label="Avg paid → archived" value={data.summary.avgPaidToArchived !== null ? `${data.summary.avgPaidToArchived}h` : "-"} />
          {finalizeBars.length > 0 ? <LazyMiniBarChart values={finalizeBars} height={72} /> : null}
          <div className="stack" style={{ gap: 6 }}>
            {latestRows.map((row) => (
              <SignalRow
                key={row.runId}
                label={formatMonthLabel(row.year, row.month)}
                value={`F→P ${row.finalizeToPaidHours ?? "-"}h | P→A ${row.paidToArchivedHours ?? "-"}h`}
              />
            ))}
          </div>
        </>
      ) : null}
    </DashboardPanel>
  );
};
