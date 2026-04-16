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
  DashboardScaffold,
  DashboardKpiTile,
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

const EMPTY_ADMIN_DASHBOARD: AdminDashboardResponse = {
  headcount: { total: 0, active: 0 },
  attendanceRate: null,
  leaveUtilization: null,
  payrollSnapshot: null,
  securityAlerts: [],
  departmentBreakdown: []
};

const EMPTY_MONITORING_OVERVIEW: MonitoringOverview = {
  rateLimitBreaches: [],
  idempotencyConflicts: [],
  approvalFailures: [],
  generated_at: "-"
};

const EMPTY_PAYROLL_RUNS: PayrollRunsResponse = { rows: [] };

export const FounderDashboard = ({
  allowedRoutes = [],
}: {
  allowedRoutes?: string[];
}) => {
  const [adminData, setAdminData] = useState<AdminDashboardResponse>(EMPTY_ADMIN_DASHBOARD);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringOverview>(EMPTY_MONITORING_OVERVIEW);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunsResponse>(EMPTY_PAYROLL_RUNS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("workspace");
  const allowedRouteSet = useMemo(() => new Set(allowedRoutes), [allowedRoutes]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.allSettled([
      fetchAdminDashboard(),
      fetchMonitoringOverview(),
      fetchPayrollRuns({ limit: 12 }),
      fetchBillingOverview()
    ])
      .then(([adminSettled, monitoringSettled, runsSettled, billingSettled]) => {
        if (!active) return;
        const adminResult = adminSettled.status === "fulfilled" ? adminSettled.value : null;
        const monitoringResult = monitoringSettled.status === "fulfilled" ? monitoringSettled.value : null;
        const runsResult = runsSettled.status === "fulfilled" ? runsSettled.value : null;
        const billingResult = billingSettled.status === "fulfilled" ? billingSettled.value : null;

        setAdminData(adminResult?.ok && adminResult.data ? adminResult.data : EMPTY_ADMIN_DASHBOARD);
        setMonitoring(monitoringResult?.ok && monitoringResult.data ? monitoringResult.data : EMPTY_MONITORING_OVERVIEW);
        setPayrollRuns(runsResult?.ok && runsResult.data ? runsResult.data : EMPTY_PAYROLL_RUNS);
        setBilling(billingResult?.ok && billingResult.data ? billingResult.data : null);

        if ((!adminResult?.ok || !adminResult.data) && (!monitoringResult?.ok || !monitoringResult.data) && (!runsResult?.ok || !runsResult.data)) {
          setError(
            adminResult?.error
            ?? monitoringResult?.error
            ?? runsResult?.error
            ?? "Unable to load founder dashboard"
          );
          return;
        }

        setError(null);
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
  const peopleHref = allowedRouteSet.has("/app/people")
    ? "/app/people"
    : allowedRouteSet.has("/app/employees")
      ? "/app/employees"
      : null;

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
    peopleHref ? { href: peopleHref, label: "People", tone: "secondary" as const } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; tone: "primary" | "secondary" }>;
  const executiveActions = [
    allowedRouteSet.has("/app/payroll") ? { label: "Payroll timelines", href: "/app/payroll", caption: "Run-level lifecycle" } : null,
    allowedRouteSet.has("/app/monitoring") ? { label: "Security monitoring", href: "/app/monitoring", caption: "Alerts and failures" } : null,
    allowedRouteSet.has("/app/billing") ? { label: "Billing console", href: "/app/billing", caption: "Invoices, seats, and subscription" } : null,
    allowedRouteSet.has("/app/approvals") ? { label: "Approvals queue", href: "/app/approvals", caption: "Operational backlog" } : null,
    peopleHref ? { label: "People directory", href: peopleHref, caption: "Headcount view" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;
  const heroSignals = [
    { label: "Plan", value: billing?.subscription?.planName ?? "Executive view" },
    { label: "Risks", value: `${riskCounts.breaches + riskCounts.idempotency + riskCounts.approvals} monitored` },
    { label: "Lanes", value: `${executiveActions.length} active` }
  ];

  if (loading) return <LoadingState label="Loading founder dashboard..." />;
  if (error && adminData.headcount.total === 0 && monitoring.generated_at === "-" && payrollRuns.rows.length === 0) {
    return <ErrorState message={error} />;
  }

  return (
    <DashboardScaffold
        eyebrow="Executive Workspace"
        title="Founder and CEO command view"
        subtitle="Read-only executive visibility across workforce, payroll lifecycle, and operational risk signals with tenant-safe summaries only."
        emphasis="executive"
        heroSignals={heroSignals}
        actions={(
          <>
            {heroActions.map((action) => (
              <Link key={action.href} href={action.href} className={action.tone === "primary" ? "primary-btn" : "secondary-btn"}>
                {action.label}
              </Link>
            ))}
          </>
        )}
        value={view}
        onViewChange={setView}
        modeTitle="Executive lenses"
        modeSubtitle="Shift between cross-company visibility, trend reading, and operating pressure without losing the executive summary layer."
      >

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
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Security alerts (30d)</span>
                  <strong className="text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-slate-50">
                    {adminData.securityAlerts.length}
                  </strong>
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
          <div className="space-y-3">
            {payrollRuns.rows.slice(0, 6).map((run) => (
              <div
                key={run.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <strong className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {String(run.month).padStart(2, "0")}/{run.year}
                  </strong>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{run.id}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={run.status} />
                  {allowedRouteSet.has("/app/payroll") ? <Link href={`/app/payroll/${run.id}/timeline`} className="secondary-btn">Timeline</Link> : null}
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </DashboardSection>
    </DashboardScaffold>
  );
};


