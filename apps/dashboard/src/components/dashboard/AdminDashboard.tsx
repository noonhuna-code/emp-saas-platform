"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchAdminDashboard, fetchBillingOverview } from "@/lib/client/api";
import { getLimitInteger, isFeatureEnabled } from "@/lib/client/entitlements";
import type { BillingOverview } from "@/lib/types/billing";
import type { AdminDashboardResponse } from "@/lib/types/dashboard";
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

export const AdminDashboard = () => {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all([fetchAdminDashboard(), fetchBillingOverview()])
      .then(([result, billingResult]) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load admin dashboard");
          return;
        }
        setData(result.data);
        if (billingResult.ok && billingResult.data) {
          setBilling(billingResult.data);
        } else {
          setBilling(null);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load admin dashboard");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const deptValues = useMemo(() => {
    if (!data) return [] as number[];
    return data.departmentBreakdown.map((row) => row.count);
  }, [data]);

  const alertTimeline = useMemo(() => {
    return (data?.securityAlerts ?? []).slice(0, 8).map((alert) => ({
      title: alert.lock_reason,
      subtitle: "Security lock event",
      meta: alert.created_at
    }));
  }, [data]);

  const analyticsStandardEnabled = isFeatureEnabled(billing?.entitlements, "feature.analytics_standard");
  const analyticsAdvancedEnabled = isFeatureEnabled(billing?.entitlements, "feature.analytics_advanced");
  const securityIntelligenceEnabled = isFeatureEnabled(billing?.entitlements, "feature.security_intelligence");
  const payslipsEnabled = isFeatureEnabled(billing?.entitlements, "feature.payslip_history_detail");
  const payrollEnabled = isFeatureEnabled(billing?.entitlements, "feature.payroll_runs");
  const seatLimit = getLimitInteger(billing?.entitlements, "limit.active_seats");

  if (loading) return <LoadingState label="Loading admin dashboard..." />;
  if (error || !data) return <ErrorState message={error ?? "Admin dashboard unavailable"} />;

  return (
    <div className="dashboard-shell fade-in">
      <DashboardHero
        eyebrow="Admin Workspace"
        title="Company operations and governance overview"
        subtitle="Tenant-scoped headcount, attendance, leave utilization, payroll snapshot, and recent security alerts."
        emphasis="executive"
        actions={(
          <>
            <Link href="/app/employees" className="secondary-btn">Employees</Link>
            <Link href="/app/payroll" className="secondary-btn">Payroll</Link>
            <Link href="/app/monitoring" className="secondary-btn">Monitoring</Link>
            <Link href="/app/approvals" className="primary-btn">Approvals</Link>
          </>
        )}
      />

      <div className="dashboard-kpi-grid">
        <DashboardKpiTile label="Total headcount" value={data.headcount.total} hint={`Active ${data.headcount.active}`} accent="info" />
        <DashboardKpiTile
          label="Plan"
          value={billing?.subscription ? billing.subscription.planName : "Unavailable"}
          hint={billing?.subscription ? billing.subscription.status : "Billing scope unavailable"}
          accent={billing?.subscription?.status === "past_due" ? "warning" : "success"}
        />
        <DashboardKpiTile label="Attendance rate" value={`${data.attendanceRate ?? 0}%`} footer={<Donut value={data.attendanceRate ?? 0} />} />
        <DashboardKpiTile
          label="Billable seats"
          value={billing ? `${billing.seatSummary.activeBillable}${seatLimit ? ` / ${seatLimit}` : ""}` : "-"}
          hint={billing ? `Active total ${billing.seatSummary.activeTotal}` : "Billing scope unavailable"}
          accent="info"
        />
        <DashboardKpiTile
          label="Payroll snapshot"
          value={data.payrollSnapshot ? currency(data.payrollSnapshot.totalNet) : "-"}
          hint={data.payrollSnapshot ? `Status ${data.payrollSnapshot.status}` : "No payroll run available"}
          accent={data.payrollSnapshot?.status === "processing" ? "warning" : "success"}
        />
      </div>

      {(analyticsStandardEnabled || analyticsAdvancedEnabled) ? (
        <PayrollAnalyticsWidgetsSection
          title="Payroll analytics"
          subtitle="Admin read-only payroll trends, delivery outcomes, growth, and closeout timing"
        />
      ) : (
        <DashboardPanel title="Payroll analytics" subtitle="Feature not enabled in current plan" tone="soft">
          <p className="muted">Enable analytics entitlements to access payroll trend and growth widgets.</p>
        </DashboardPanel>
      )}

      <div className="grid-3">
        <SubscriptionHealthPanel
          billing={billing}
          payrollRunsUsed={data.payrollSnapshot ? 1 : 0}
          title="Subscription health"
          subtitle="Plan status, seat utilization, and renewal risk"
        />

        <DashboardPanel title="Executive quick actions" subtitle="Common admin workflows">
          <QuickActionGrid
            actions={[
              { label: "Employee Directory", href: "/app/employees", caption: "Headcount and profiles" },
              ...(payrollEnabled ? [{ label: "Payroll Runs", href: "/app/payroll", caption: "Review lifecycle" }] : []),
              ...(payslipsEnabled ? [{ label: "Payslips", href: "/app/payslips", caption: "Snapshot history" }] : []),
              { label: "Security Monitoring", href: "/app/monitoring", caption: "Tenant signals" }
            ]}
          />
        </DashboardPanel>

        {securityIntelligenceEnabled ? (
          <DashboardPanel title="Security posture" subtitle="Immutable security telemetry summary" tone="soft">
            <SignalRow label="Recent security alerts" value={data.securityAlerts.length} tone={data.securityAlerts.length > 0 ? "warning" : "success"} />
            <SignalRow label="Auth rate limiting" value="Active" tone="success" />
            <SignalRow label="Risk scoring" value="Enabled" tone="info" />
            <SignalRow label="Audit immutability" value="Enforced" tone="success" />
          </DashboardPanel>
        ) : (
          <DashboardPanel title="Security posture" subtitle="Feature not enabled" tone="soft">
            <p className="muted">Security intelligence indicators are disabled for this plan.</p>
          </DashboardPanel>
        )}
      </div>

      <div className="grid-2">
        <DashboardPanel title="Payroll snapshot" subtitle="Most recent payroll run totals and status" tone="spotlight">
          {data.payrollSnapshot ? (
            <>
              <SignalRow label="Run ID" value={data.payrollSnapshot.runId} />
              <SignalRow label="Status" value={<StatusBadge status={data.payrollSnapshot.status} />} />
              <SignalRow label="Total net" value={currency(data.payrollSnapshot.totalNet)} tone="info" />
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <Link href="/app/payroll" className="secondary-btn">Open payroll workspace</Link>
              </div>
            </>
          ) : (
            <p className="muted">No payroll run available.</p>
          )}
        </DashboardPanel>

        <DashboardPanel title="Recent security alerts" subtitle="Tenant-scoped account lock events">
          {alertTimeline.length > 0 ? <TimelineList items={alertTimeline} /> : <p className="muted">No alerts in the last 30 days.</p>}
        </DashboardPanel>
      </div>

      <div className="grid-2">
        <DashboardPanel title="Department distribution" subtitle="Employee count by department">
          {data.departmentBreakdown.length === 0 ? <p className="muted">No departments configured.</p> : null}
          {data.departmentBreakdown.map((dept) => (
            <SignalRow key={dept.department} label={dept.department} value={dept.count} />
          ))}
          {deptValues.length > 0 ? <MiniBarChart values={deptValues} height={88} /> : null}
        </DashboardPanel>

        <DashboardPanel title="Operations summary" subtitle="Read-only governance indicators">
          <SignalRow label="Headcount total" value={data.headcount.total} />
          <SignalRow label="Headcount active" value={data.headcount.active} />
          <SignalRow label="Attendance rate" value={`${data.attendanceRate ?? 0}%`} tone="info" />
          <SignalRow label="Leave utilization" value={`${data.leaveUtilization ?? 0}%`} tone="warning" />
          <SignalRow label="Alerts (30d)" value={data.securityAlerts.length} tone={data.securityAlerts.length > 0 ? "warning" : "success"} />
        </DashboardPanel>
      </div>
    </div>
  );
};
