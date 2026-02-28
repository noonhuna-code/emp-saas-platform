"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchAdminDashboard, fetchBillingOverview, fetchMonitoringOverview, fetchPayrollRuns } from "@/lib/client/api";
import { getLimitInteger, isFeatureEnabled } from "@/lib/client/entitlements";
import type { BillingOverview } from "@/lib/types/billing";
import type { AdminDashboardResponse } from "@/lib/types/dashboard";
import type { MonitoringOverview } from "@/lib/types/monitoring";
import type { PayrollRunsResponse } from "@/lib/types/payroll";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { Donut, MiniBarChart } from "@/components/shared/Charts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PayrollAnalyticsWidgetsSection } from "@/components/dashboard/payroll-analytics/PayrollAnalyticsWidgetsSection";
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

export const FounderDashboard = () => {
  const [adminData, setAdminData] = useState<AdminDashboardResponse | null>(null);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringOverview | null>(null);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all([
      fetchAdminDashboard(),
      fetchMonitoringOverview(),
      fetchPayrollRuns({ limit: 12 }),
      fetchBillingOverview()
    ])
      .then(([adminResult, monitoringResult, runsResult, billingResult]) => {
        if (!active) return;
        if (!adminResult.ok || !adminResult.data) {
          setError(adminResult.error ?? "Unable to load executive dashboard");
          return;
        }
        if (!monitoringResult.ok || !monitoringResult.data) {
          setError(monitoringResult.error ?? "Unable to load monitoring summary");
          return;
        }
        if (!runsResult.ok || !runsResult.data) {
          setError(runsResult.error ?? "Unable to load payroll runs");
          return;
        }

        setAdminData(adminResult.data);
        setMonitoring(monitoringResult.data);
        setPayrollRuns(runsResult.data);

        if (billingResult.ok && billingResult.data) {
          setBilling(billingResult.data);
        } else {
          setBilling(null);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load founder dashboard");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const trendBars = useMemo(
    () => (payrollRuns?.rows ?? []).slice(0, 8).map((run) => (run.locked ? 4 : run.status === "processing" ? 2 : 3)),
    [payrollRuns]
  );

  const riskCounts = useMemo(() => {
    return {
      breaches: monitoring?.rateLimitBreaches.length ?? 0,
      idempotency: monitoring?.idempotencyConflicts.length ?? 0,
      approvals: monitoring?.approvalFailures.length ?? 0
    };
  }, [monitoring]);

  const payrollTimeline = useMemo(() => {
    return (payrollRuns?.rows ?? []).slice(0, 8).map((run) => ({
      title: `${String(run.month).padStart(2, "0")}/${run.year}`,
      subtitle: `${run.start_date} - ${run.end_date}`,
      meta: run.status
    }));
  }, [payrollRuns]);

  const analyticsStandardEnabled = isFeatureEnabled(billing?.entitlements, "feature.analytics_standard");
  const analyticsAdvancedEnabled = isFeatureEnabled(billing?.entitlements, "feature.analytics_advanced");
  const securityIntelligenceEnabled = isFeatureEnabled(billing?.entitlements, "feature.security_intelligence");
  const seatLimit = getLimitInteger(billing?.entitlements, "limit.active_seats");
  const payrollRunLimit = getLimitInteger(billing?.entitlements, "limit.payroll_runs_per_month_max");

  if (loading) return <LoadingState label="Loading founder dashboard..." />;
  if (error || !adminData || !monitoring || !payrollRuns) return <ErrorState message={error ?? "Founder dashboard unavailable"} />;

  return (
    <div className="dashboard-shell fade-in">
      <DashboardHero
        eyebrow="Executive Workspace"
        title="Founder and CEO command view"
        subtitle="Read-only executive visibility across workforce, payroll lifecycle, and operational risk signals with tenant-safe summaries only."
        emphasis="executive"
        actions={(
          <>
            <Link href="/app/monitoring" className="primary-btn">Monitoring</Link>
            <Link href="/app/payroll" className="secondary-btn">Payroll</Link>
            <Link href="/app/employees" className="secondary-btn">People</Link>
          </>
        )}
      />

      <div className="dashboard-kpi-grid">
        <DashboardKpiTile label="Headcount" value={adminData.headcount.total} hint={`Active ${adminData.headcount.active}`} accent="info" />
        <DashboardKpiTile
          label="Plan"
          value={billing?.subscription ? billing.subscription.planName : "Unavailable"}
          hint={billing?.subscription ? billing.subscription.status : "Billing scope unavailable"}
          accent={billing?.subscription?.status === "past_due" ? "warning" : "success"}
        />
        <DashboardKpiTile label="Attendance rate" value={`${adminData.attendanceRate ?? 0}%`} footer={<Donut value={adminData.attendanceRate ?? 0} />} />
        <DashboardKpiTile
          label="Billable seats"
          value={billing ? `${billing.seatSummary.activeBillable}${seatLimit ? ` / ${seatLimit}` : ""}` : "-"}
          hint={billing ? `Active total ${billing.seatSummary.activeTotal}` : "Billing scope unavailable"}
          accent="info"
        />
        <DashboardKpiTile
          label="Payroll snapshot"
          value={adminData.payrollSnapshot ? currency(adminData.payrollSnapshot.totalNet) : "-"}
          hint={adminData.payrollSnapshot ? `${adminData.payrollSnapshot.status}${payrollRunLimit ? ` | Limit ${payrollRunLimit}/mo` : ""}` : "No run"}
          accent="success"
        />
      </div>

      {(analyticsStandardEnabled || analyticsAdvancedEnabled) ? (
        <PayrollAnalyticsWidgetsSection
          title="Payroll analytics"
          subtitle="Executive trend, delivery quality, growth, and closeout latency (read-only)"
        />
      ) : (
        <DashboardPanel title="Payroll analytics" subtitle="Feature not enabled in current plan" tone="soft">
          <p className="muted">
            Advanced analytics is gated by your billing entitlement. Upgrade plan to unlock executive trend surfaces.
          </p>
        </DashboardPanel>
      )}

      <div className="grid-3">
        <DashboardPanel title="Operational risk indicators" subtitle="Monitoring summary" tone="spotlight">
          <SignalRow label="Rate-limit breaches" value={riskCounts.breaches} tone={riskCounts.breaches > 0 ? "warning" : "success"} />
          <SignalRow label="Idempotency conflicts" value={riskCounts.idempotency} tone={riskCounts.idempotency > 0 ? "warning" : "success"} />
          <SignalRow label="Approval failures" value={riskCounts.approvals} tone={riskCounts.approvals > 0 ? "warning" : "success"} />
          <SignalRow label="Generated at" value={monitoring.generated_at} />
        </DashboardPanel>

        {securityIntelligenceEnabled ? (
          <DashboardPanel title="Security pressure" subtitle="Recent lock alerts" tone="soft">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="stack" style={{ gap: 4 }}>
                <span className="muted" style={{ fontSize: 12 }}>Security alerts (30d)</span>
                <strong style={{ fontSize: 22 }}>{adminData.securityAlerts.length}</strong>
              </div>
              <Donut value={Math.min(100, adminData.securityAlerts.length * 10)} />
            </div>
            {adminData.securityAlerts.slice(0, 4).map((alert) => (
              <SignalRow key={alert.id} label={alert.lock_reason} value={alert.created_at} tone="warning" />
            ))}
          </DashboardPanel>
        ) : (
          <DashboardPanel title="Security pressure" subtitle="Feature not enabled" tone="soft">
            <p className="muted">
              Security intelligence widgets are disabled for this billing plan.
            </p>
          </DashboardPanel>
        )}

        <DashboardPanel title="Payroll lifecycle trend" subtitle="Recent run progression" tone="soft">
          {trendBars.length > 0 ? <MiniBarChart values={trendBars} height={88} /> : <p className="muted">No payroll runs available.</p>}
          <p className="muted">Read-only signal based on run status and lock state.</p>
        </DashboardPanel>
      </div>

      <div className="grid-3">
        <SubscriptionHealthPanel
          billing={billing}
          payrollRunsUsed={payrollRuns.rows.length}
          title="Billing and subscription health"
          subtitle="Renewal risk, seat usage, and plan limits"
        />

        <DashboardPanel title="Quick actions" subtitle="Executive navigation">
          <QuickActionGrid
            actions={[
              { label: "Payroll timelines", href: "/app/payroll", caption: "Run-level lifecycle" },
              { label: "Security monitoring", href: "/app/monitoring", caption: "Alerts and failures" },
              { label: "Approvals queue", href: "/app/approvals", caption: "Operational backlog" },
              { label: "People directory", href: "/app/employees", caption: "Headcount view" }
            ]}
          />
        </DashboardPanel>

        <DashboardPanel title="Department distribution" subtitle="Headcount by department">
          {adminData.departmentBreakdown.length === 0 ? <p className="muted">No department data.</p> : null}
          {adminData.departmentBreakdown.map((dept) => (
            <SignalRow key={dept.department} label={dept.department} value={dept.count} />
          ))}
          {adminData.departmentBreakdown.length > 0 ? <MiniBarChart values={adminData.departmentBreakdown.map((d) => d.count)} height={84} /> : null}
        </DashboardPanel>
      </div>

      <div className="grid-2">
        <DashboardPanel title="Recent payroll runs" subtitle="Lifecycle and lock visibility">
          {payrollTimeline.length > 0 ? <TimelineList items={payrollTimeline} /> : <p className="muted">No payroll runs available.</p>}
        </DashboardPanel>

        <DashboardPanel title="Run actions" subtitle="Read-only drilldown links">
          {payrollRuns.rows.slice(0, 6).map((run) => (
            <div key={run.id} className="row" style={{ justifyContent: "space-between" }}>
              <div className="stack" style={{ gap: 4 }}>
                <strong>{String(run.month).padStart(2, "0")}/{run.year}</strong>
                <span className="muted">{run.id}</span>
              </div>
              <div className="row">
                <StatusBadge status={run.status} />
                <Link href={`/app/payroll/${run.id}/timeline`} className="secondary-btn">Timeline</Link>
              </div>
            </div>
          ))}
        </DashboardPanel>
      </div>
    </div>
  );
};
