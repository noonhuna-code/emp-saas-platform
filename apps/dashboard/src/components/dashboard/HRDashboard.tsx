"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchBillingOverview, fetchPayrollRuns, fetchPayslipHistory } from "@/lib/client/api";
import { getLimitInteger, isFeatureEnabled } from "@/lib/client/entitlements";
import type { BillingOverview } from "@/lib/types/billing";
import type { PayrollRunsResponse, PayslipHistoryResponse } from "@/lib/types/payroll";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MiniBarChart } from "@/components/shared/Charts";
import { SubscriptionHealthPanel } from "@/components/dashboard/SubscriptionHealthPanel";
import {
  DashboardHero,
  DashboardKpiTile,
  DashboardPanel,
  QuickActionGrid,
  SignalRow,
  TimelineList
} from "@/components/dashboard/DashboardPrimitives";

const currency = (value: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

export const HRDashboard = () => {
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [runs, setRuns] = useState<PayrollRunsResponse | null>(null);
  const [payslips, setPayslips] = useState<PayslipHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all([
      fetchPayrollRuns({ limit: 8 }),
      fetchPayslipHistory({ page: 1, pageSize: 10 }),
      fetchBillingOverview()
    ])
      .then(([runsResult, payslipsResult, billingResult]) => {
        if (!active) return;
        if (!runsResult.ok || !runsResult.data) {
          setError(runsResult.error ?? "Unable to load payroll runs");
          return;
        }
        if (!payslipsResult.ok || !payslipsResult.data) {
          setError(payslipsResult.error ?? "Unable to load payslips");
          return;
        }
        setRuns(runsResult.data);
        setPayslips(payslipsResult.data);

        if (billingResult.ok && billingResult.data) {
          setBilling(billingResult.data);
        } else {
          setBilling(null);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load HR dashboard");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const rows = payslips?.rows ?? [];
    const totalNet = rows.reduce((acc, row) => acc + row.netSalary, 0);
    const lockedCount = rows.filter((row) => row.isLocked).length;
    const paidCount = rows.filter((row) => row.status.toLowerCase() === "paid").length;
    return { totalNet, lockedCount, count: rows.length, paidCount };
  }, [payslips]);

  const payrollRunBars = useMemo(() => {
    return (runs?.rows ?? []).slice(0, 6).map((row) => (row.locked ? 4 : row.status === "processing" ? 2 : 3));
  }, [runs]);

  const runTimeline = useMemo(() => {
    return (runs?.rows ?? []).slice(0, 6).map((run) => ({
      title: `${String(run.month).padStart(2, "0")}/${run.year}`,
      subtitle: `${run.start_date} - ${run.end_date}`,
      meta: run.status
    }));
  }, [runs]);

  const payrollRunsEnabled = isFeatureEnabled(billing?.entitlements, "feature.payroll_runs");
  const payslipsEnabled = isFeatureEnabled(billing?.entitlements, "feature.payslip_history_detail");
  const payrollRunsLimit = getLimitInteger(billing?.entitlements, "limit.payroll_runs_per_month_max");
  const payslipEmailsLimit = getLimitInteger(billing?.entitlements, "limit.payslip_emails_per_month_max");

  if (loading) return <LoadingState label="Loading HR dashboard..." />;
  if (error || !runs || !payslips) return <ErrorState message={error ?? "HR dashboard unavailable"} />;

  const latestRun = runs.rows[0] ?? null;

  return (
    <div className="dashboard-shell fade-in">
      <DashboardHero
        eyebrow="HR Workspace"
        title="Payroll operations visibility"
        subtitle="Read-only payroll run lifecycle monitoring and payslip snapshot throughput for HR and payroll operations teams."
        emphasis="operations"
        actions={(
          <>
            <Link href="/app/payroll" className="primary-btn">Payroll Runs</Link>
            <Link href="/app/payslips" className="secondary-btn">Payslips</Link>
          </>
        )}
      />

      <div className="dashboard-kpi-grid">
        <DashboardKpiTile
          label="Plan"
          value={billing?.subscription ? billing.subscription.planName : "Unavailable"}
          hint={billing?.subscription ? billing.subscription.status : "Billing scope unavailable"}
          accent={billing?.subscription?.status === "past_due" ? "warning" : "success"}
        />
        <DashboardKpiTile label="Payroll runs" value={runs.rows.length} hint="Recent timeline sample" accent="info" />
        <DashboardKpiTile label="Payslip rows" value={totals.count} hint={`Scope: ${payslips.viewerScope}`} accent="info" />
        <DashboardKpiTile label="Locked payslips" value={totals.lockedCount} hint={`Paid snapshots ${totals.paidCount}`} accent={totals.lockedCount > 0 ? "success" : "default"} />
        <DashboardKpiTile
          label="Page net total"
          value={currency(totals.totalNet)}
          hint={`Run limit ${payrollRunsLimit ?? "-"} | Email limit ${payslipEmailsLimit ?? "-"}`}
          accent="success"
        />
      </div>

      <div className="grid-3">
        <SubscriptionHealthPanel
          billing={billing}
          payrollRunsUsed={runs.rows.length}
          payslipRowsUsed={payslips.rows.length}
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
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <Link href={`/app/payroll/${latestRun.id}/timeline`} className="secondary-btn">View timeline</Link>
                  <Link href={`/app/payroll/${latestRun.id}`} className="secondary-btn">Open run</Link>
                </div>
                {payrollRunBars.length > 0 ? <MiniBarChart values={payrollRunBars} height={72} /> : null}
              </>
            ) : (
              <p className="muted">No payroll runs available.</p>
            )}
          </DashboardPanel>
        ) : (
          <DashboardPanel title="Payroll lifecycle watch" subtitle="Feature not enabled in current plan" tone="soft">
            <p className="muted">Payroll run visibility is disabled by billing entitlement.</p>
          </DashboardPanel>
        )}

        <DashboardPanel title="Quick actions" subtitle="Payroll support navigation">
          <QuickActionGrid
            actions={[
              ...(payrollRunsEnabled ? [{ label: "Payroll workspace", href: "/app/payroll", caption: "Run list and details" }] : []),
              ...(payslipsEnabled ? [{ label: "Payslip history", href: "/app/payslips", caption: "Employee snapshots" }] : []),
              { label: "Approvals", href: "/app/approvals", caption: "Cross-workflow queue" },
              { label: "Monitoring", href: "/app/monitoring", caption: "Operational signals" }
            ]}
          />
        </DashboardPanel>
      </div>

      <div className="grid-2">
        {payrollRunsEnabled ? (
          <DashboardPanel title="Recent payroll runs" subtitle="Run lifecycle sample">
            {runTimeline.length > 0 ? <TimelineList items={runTimeline} /> : <p className="muted">No payroll runs found.</p>}
          </DashboardPanel>
        ) : (
          <DashboardPanel title="Recent payroll runs" subtitle="Feature not enabled" tone="soft">
            <p className="muted">Upgrade plan to enable payroll run history widgets.</p>
          </DashboardPanel>
        )}

        {payslipsEnabled ? (
          <DashboardPanel title="Recent payslip history" subtitle="Read-only payroll entry snapshots">
            {payslips.rows.length === 0 ? <p className="muted">No payslip history available.</p> : null}
            {payslips.rows.slice(0, 10).map((row) => (
              <div key={row.entryId} className="row" style={{ justifyContent: "space-between" }}>
                <div className="stack" style={{ gap: 4 }}>
                  <strong>{row.period}</strong>
                  <span className="muted">{row.employeeName} | {currency(row.netSalary)}</span>
                </div>
                <div className="row">
                  <StatusBadge status={row.status} />
                  <Link href={`/app/payslips/${row.entryId}`} className="secondary-btn">View</Link>
                </div>
              </div>
            ))}
          </DashboardPanel>
        ) : (
          <DashboardPanel title="Recent payslip history" subtitle="Feature not enabled" tone="soft">
            <p className="muted">Payslip history access is disabled by current billing plan.</p>
          </DashboardPanel>
        )}
      </div>
    </div>
  );
};
