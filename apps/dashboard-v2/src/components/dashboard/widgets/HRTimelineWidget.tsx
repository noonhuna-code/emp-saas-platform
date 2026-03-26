"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardPanel, TimelineList } from "@/components/dashboard/DashboardPrimitives";
import { SkeletonList } from "@/components/ui/SkeletonBlocks";
import { isFeatureEnabled } from "@/lib/client/entitlements";
import {
  loadBillingOverviewData,
  loadPayrollRunsData,
  loadPayslipHistoryData
} from "@/components/dashboard/widgets/dashboard-data-loaders";

const currency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);

export default function HRTimelineWidget({
  allowedRoutes = [],
}: {
  allowedRoutes?: string[];
}) {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<Awaited<ReturnType<typeof loadBillingOverviewData>>>(null);
  const [runsData, setRunsData] = useState<Awaited<ReturnType<typeof loadPayrollRunsData>>>(null);
  const [payslipData, setPayslipData] = useState<Awaited<ReturnType<typeof loadPayslipHistoryData>>>(null);
  const allowedRouteSet = useMemo(() => new Set(allowedRoutes), [allowedRoutes]);

  useEffect(() => {
    let active = true;

    void Promise.all([loadPayrollRunsData(), loadPayslipHistoryData(), loadBillingOverviewData()])
      .then(([runs, payslips, billing]) => {
        if (!active) return;
        setRunsData(runs);
        setPayslipData(payslips);
        setBillingData(billing);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const runTimeline = useMemo(() => {
    return (runsData?.rows ?? []).slice(0, 6).map((run) => ({
      title: `${String(run.month).padStart(2, "0")}/${run.year}`,
      subtitle: `${run.start_date} - ${run.end_date}`,
      meta: run.status
    }));
  }, [runsData]);

  if (loading) {
    return (
      <div className="grid-2">
        <SkeletonList rows={6} />
        <SkeletonList rows={8} />
      </div>
    );
  }

  const payrollRunsEnabled = isFeatureEnabled(billingData?.entitlements, "feature.payroll_runs");
  const payslipsEnabled = isFeatureEnabled(billingData?.entitlements, "feature.payslip_history_detail");

  return (
    <div className="grid-2">
      {payrollRunsEnabled && allowedRouteSet.has("/app/payroll") ? (
        <DashboardPanel title="Recent payroll runs" subtitle="Run lifecycle sample">
          {runTimeline.length > 0 ? <TimelineList items={runTimeline} /> : <p className="muted">No payroll runs found.</p>}
        </DashboardPanel>
      ) : (
        <DashboardPanel title="Recent payroll runs" subtitle="Payroll visibility unavailable" tone="soft">
          <p className="muted">Payroll run history is not currently available in this workspace.</p>
        </DashboardPanel>
      )}

      {payslipsEnabled && allowedRouteSet.has("/app/payslips") ? (
        <DashboardPanel title="Recent payslip history" subtitle="Read-only payroll entry snapshots">
          {(payslipData?.rows.length ?? 0) === 0 ? <p className="muted">No payslip history available.</p> : null}
          {(payslipData?.rows ?? []).slice(0, 10).map((row) => (
            <div key={row.entryId} className="row" style={{ justifyContent: "space-between" }}>
              <div className="stack" style={{ gap: 4 }}>
                <strong>{row.period}</strong>
                <span className="muted">{row.employeeName} | {currency(row.netSalary)}</span>
              </div>
              <Link href={`/app/payslips/${row.entryId}`} className="secondary-btn">View</Link>
            </div>
          ))}
        </DashboardPanel>
      ) : (
        <DashboardPanel title="Recent payslip history" subtitle="Payslip visibility unavailable" tone="soft">
          <p className="muted">Payslip history is not currently available in this workspace.</p>
        </DashboardPanel>
      )}
    </div>
  );
}
