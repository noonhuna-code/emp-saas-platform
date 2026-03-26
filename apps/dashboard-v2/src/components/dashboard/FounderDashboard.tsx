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
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Donut, MiniBarChart } from "@/components/shared/Charts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PayrollAnalyticsWidgetsSection } from "@/components/dashboard/payroll-analytics/PayrollAnalyticsWidgetsSection";
import { SubscriptionHealthPanel } from "@/components/dashboard/SubscriptionHealthPanel";
import {
  ChartPanel,
  DashboardHero,
  DashboardKpiTile,
  DashboardModeSwitch,
  DashboardPanel,
  DashboardSection,
  QuickActionGrid,
  SignalRow,
  TimelineList,
  WorkflowPanel,
  type DashboardView
} from "@/components/dashboard/DashboardPrimitives";

const currency = (value: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

export const FounderDashboard = ({
  allowedRoutes = [],
}: {
  allowedRoutes?: string[];
}) => {
  const [adminData, setAdminData] = useState<AdminDashboardResponse | null>(null);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringOverview | null>(null);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("workspace");
  const allowedRouteSet = useMemo(() => new Set(allowedRoutes), [allowedRoutes]);

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

  const activityItems = useMemo(
    () =>
      (payrollRuns?.rows ?? []).slice(0, 5).map((run) => ({
        id: run.id,
        title: `Payroll ${String(run.month).padStart(2, "0")}/${run.year}`,
        description: `Status ${run.status} | Period ${run.start_date} to ${run.end_date}`,
        timestamp: run.created_at ?? "-"
      })),
    [payrollRuns?.rows]
  );
  const heroActions = [
    allowedRouteSet.has("/app/monitoring") ? { href: "/app/monitoring", label: "Monitoring", tone: "primary" as const } : null,
    allowedRouteSet.has("/app/payroll") ? { href: "/app/payroll", label: "Payroll", tone: "secondary" as const } : null,
    allowedRouteSet.has("/app/billing") ? { href: "/app/billing", label: "Billing", tone: "secondary" as const } : null,
    allowedRouteSet.has("/app/employees") ? { href: "/app/employees", label: "People", tone: "secondary" as const } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; tone: "primary" | "secondary" }>;
  const executiveActions = [
    allowedRouteSet.has("/app/payroll") ? { label: "Payroll timelines", href: "/app/payroll", caption: "Run-level lifecycle" } : null,
    allowedRouteSet.has("/app/monitoring") ? { label: "Security monitoring", href: "/app/monitoring", caption: "Alerts and failures" } : null,
    allowedRouteSet.has("/app/billing") ? { label: "Billing console", href: "/app/billing", caption: "Invoices, seats, and subscription" } : null,
    allowedRouteSet.has("/app/approvals") ? { label: "Approvals queue", href: "/app/approvals", caption: "Operational backlog" } : null,
    allowedRouteSet.has("/app/employees") ? { label: "People directory", href: "/app/employees", caption: "Headcount view" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;

  if (loading) return <LoadingState label="Loading founder dashboard..." />;
  if (error || !adminData || !monitoring || !payrollRuns) return <ErrorState message={error ?? "Founder dashboard unavailable"} />;

  return (
    <div className="page-wrap space-y-8 fade-in">
      <DashboardHero
        eyebrow="Executive Workspace"
        title="Founder and CEO command view"
        subtitle="Read-only executive visibility across workforce, payroll lifecycle, and operational risk signals with tenant-safe summaries only."
        emphasis="executive"
        actions={(
          <>
            {heroActions.map((action) => (
              <Link key={action.href} href={action.href} className={action.tone === "primary" ? "primary-btn" : "secondary-btn"}>
                {action.label}
              </Link>
            ))}
          </>
        )}
      />

      <DashboardModeSwitch
        value={view}
        onChange={setView}
        title="Executive lenses"
        subtitle="Shift between cross-company visibility, trend reading, and operating pressure without losing the executive summary layer."
      />

      <DashboardSection visible={view === "workspace"}>
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SubscriptionHealthPanel
            billing={billing}
            payrollRunsUsed={payrollRuns.rows.length}
            title="Billing and subscription health"
            subtitle="Renewal risk, seat usage, and plan limits"
          />

          <WorkflowPanel title="Quick actions" subtitle="Executive navigation">
            <QuickActionGrid actions={executiveActions} />
          </WorkflowPanel>
        </div>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        {(analyticsStandardEnabled || analyticsAdvancedEnabled) ? (
          <PayrollAnalyticsWidgetsSection
            title="Payroll analytics"
            subtitle="Executive trend, delivery quality, growth, and closeout latency (read-only)"
          />
        ) : (
          <ChartPanel title="Payroll analytics" subtitle="Analytics currently unavailable">
            <p className="muted">
              Executive payroll analytics are not currently available in this workspace.
            </p>
          </ChartPanel>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartPanel title="Department distribution" subtitle="Headcount by department">
            {adminData.departmentBreakdown.length === 0 ? <p className="muted">No department data.</p> : null}
            {adminData.departmentBreakdown.map((dept) => (
              <SignalRow key={dept.department} label={dept.department} value={dept.count} />
            ))}
            {adminData.departmentBreakdown.length > 0 ? <MiniBarChart values={adminData.departmentBreakdown.map((d) => d.count)} height={84} /> : null}
          </ChartPanel>

          <ChartPanel title="Payroll lifecycle trend" subtitle="Recent run progression">
            {trendBars.length > 0 ? <MiniBarChart values={trendBars} height={88} /> : <p className="muted">No payroll runs available.</p>}
            <p className="muted">Read-only signal based on run status and lock state.</p>
          </ChartPanel>
        </div>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkflowPanel title="Operational risk indicators" subtitle="Monitoring summary">
            <SignalRow label="Rate-limit breaches" value={riskCounts.breaches} tone={riskCounts.breaches > 0 ? "warning" : "success"} />
            <SignalRow label="Idempotency conflicts" value={riskCounts.idempotency} tone={riskCounts.idempotency > 0 ? "warning" : "success"} />
            <SignalRow label="Approval failures" value={riskCounts.approvals} tone={riskCounts.approvals > 0 ? "warning" : "success"} />
            <SignalRow label="Generated at" value={monitoring.generated_at} />
          </WorkflowPanel>

          {securityIntelligenceEnabled ? (
            <WorkflowPanel title="Security pressure" subtitle="Recent lock alerts">
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
            </WorkflowPanel>
          ) : (
            <WorkflowPanel title="Security pressure" subtitle="Feature not enabled">
              <p className="muted">Security intelligence widgets are not currently available in this workspace.</p>
            </WorkflowPanel>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkflowPanel title="Recent payroll runs" subtitle="Lifecycle and lock visibility">
            {payrollTimeline.length > 0 ? <TimelineList items={payrollTimeline} /> : <p className="muted">No payroll runs available.</p>}
          </WorkflowPanel>

          <WorkflowPanel title="Activity feed" subtitle="Latest executive events">
            <ActivityFeed items={activityItems} />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Run actions" subtitle="Read-only drilldown links">
          {payrollRuns.rows.slice(0, 6).map((run) => (
            <div key={run.id} className="row" style={{ justifyContent: "space-between" }}>
              <div className="stack" style={{ gap: 4 }}>
                <strong>{String(run.month).padStart(2, "0")}/{run.year}</strong>
                <span className="muted">{run.id}</span>
              </div>
              <div className="row">
                <StatusBadge status={run.status} />
                {allowedRouteSet.has("/app/payroll") ? <Link href={`/app/payroll/${run.id}/timeline`} className="secondary-btn">Timeline</Link> : null}
              </div>
            </div>
          ))}
        </DashboardPanel>
      </DashboardSection>
    </div>
  );
};


