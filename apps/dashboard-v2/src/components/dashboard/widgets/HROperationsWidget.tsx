"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardPanel, QuickActionGrid, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import { SubscriptionHealthPanel } from "@/components/dashboard/SubscriptionHealthPanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MiniBarChart } from "@/components/shared/Charts";
import { SkeletonCard, SkeletonChart } from "@/components/ui/SkeletonBlocks";
import { isFeatureEnabled } from "@/lib/client/entitlements";
import {
  loadBillingOverviewData,
  loadPayrollRunsData,
  loadPayslipHistoryData
} from "@/components/dashboard/widgets/dashboard-data-loaders";

export default function HROperationsWidget({
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

  const payrollRunBars = useMemo(() => {
    return (runsData?.rows ?? []).slice(0, 6).map((row) => (row.locked ? 4 : row.status === "processing" ? 2 : 3));
  }, [runsData]);

  if (loading) {
    return (
      <div className="grid-3">
        <SkeletonCard rows={5} />
        <SkeletonChart />
        <SkeletonCard rows={6} />
      </div>
    );
  }

  const latestRun = runsData?.rows[0] ?? null;
  const payrollRunsEnabled = isFeatureEnabled(billingData?.entitlements, "feature.payroll_runs");
  const payslipsEnabled = isFeatureEnabled(billingData?.entitlements, "feature.payslip_history_detail");

  return (
    <div className="grid-3">
      <SubscriptionHealthPanel
        billing={billingData}
        payrollRunsUsed={runsData?.rows.length ?? 0}
        payslipRowsUsed={payslipData?.rows.length ?? 0}
        title="Plan and billing health"
        subtitle="Seat pressure and payroll-related limits"
      />

      {payrollRunsEnabled ? (
        <DashboardPanel title="Payroll lifecycle watch" subtitle="Latest run status + recent progression" tone="spotlight">
          {latestRun ? (
            <>
              <SignalRow label="Latest period" value={`${String(latestRun.month).padStart(2, "0")}/${latestRun.year}`} />
              <SignalRow label="Status" value={<StatusBadge status={latestRun.status} />} />
              <SignalRow label="Lock state" value={<StatusBadge status={latestRun.locked ? "locked" : "unlocked"} />} tone={latestRun.locked ? "success" : "warning"} />
              {allowedRouteSet.has("/app/payroll") ? (
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <Link href={`/app/payroll/${latestRun.id}/timeline`} className="secondary-btn">View timeline</Link>
                  <Link href={`/app/payroll/${latestRun.id}`} className="secondary-btn">Open run</Link>
                </div>
              ) : null}
              {payrollRunBars.length > 0 ? <MiniBarChart values={payrollRunBars} height={72} /> : null}
            </>
          ) : (
            <p className="muted">No payroll runs available.</p>
          )}
        </DashboardPanel>
      ) : (
        <DashboardPanel title="Payroll lifecycle watch" subtitle="Payroll visibility unavailable" tone="soft">
          <p className="muted">Payroll lifecycle visibility is not currently available in this workspace.</p>
        </DashboardPanel>
      )}

      <DashboardPanel title="Quick actions" subtitle="Payroll support navigation">
        <QuickActionGrid
          actions={[
            ...(payrollRunsEnabled && allowedRouteSet.has("/app/payroll") ? [{ label: "Payroll workspace", href: "/app/payroll", caption: "Run list and details" }] : []),
            ...(payslipsEnabled && allowedRouteSet.has("/app/payslips") ? [{ label: "Payslip history", href: "/app/payslips", caption: "Employee snapshots" }] : []),
            ...(allowedRouteSet.has("/app/approvals") ? [{ label: "Approvals", href: "/app/approvals", caption: "Cross-workflow queue" }] : []),
            ...(allowedRouteSet.has("/app/monitoring") ? [{ label: "Monitoring", href: "/app/monitoring", caption: "Operational signals" }] : [])
          ]}
        />
      </DashboardPanel>
    </div>
  );
}
