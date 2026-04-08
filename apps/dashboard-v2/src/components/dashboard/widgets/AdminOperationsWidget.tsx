"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardPanel, QuickActionGrid, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import { SubscriptionHealthPanel } from "@/components/dashboard/SubscriptionHealthPanel";
import { SkeletonCard } from "@/components/ui/SkeletonBlocks";
import { isFeatureEnabled } from "@/lib/client/entitlements";
import {
  loadAdminDashboardData,
  loadBillingOverviewData
} from "@/components/dashboard/widgets/dashboard-data-loaders";

export default function AdminOperationsWidget({
  allowedRoutes = [],
}: {
  allowedRoutes?: string[];
}) {
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<Awaited<ReturnType<typeof loadAdminDashboardData>>>(null);
  const [billingData, setBillingData] = useState<Awaited<ReturnType<typeof loadBillingOverviewData>>>(null);
  const allowedRouteSet = new Set(allowedRoutes);
  const peopleHref = allowedRouteSet.has("/app/people")
    ? "/app/people"
    : allowedRouteSet.has("/app/employees")
      ? "/app/employees"
      : null;

  useEffect(() => {
    let active = true;

    void Promise.all([loadAdminDashboardData(), loadBillingOverviewData()])
      .then(([admin, billing]) => {
        if (!active) return;
        setAdminData(admin);
        setBillingData(billing);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid-3">
        <SkeletonCard rows={5} />
        <SkeletonCard rows={6} />
        <SkeletonCard rows={5} />
      </div>
    );
  }

  const payrollEnabled = isFeatureEnabled(billingData?.entitlements, "feature.payroll_runs");
  const payslipsEnabled = isFeatureEnabled(billingData?.entitlements, "feature.payslip_history_detail");
  const securityIntelligenceEnabled = isFeatureEnabled(billingData?.entitlements, "feature.security_intelligence");

  return (
    <div className="grid-3">
      <SubscriptionHealthPanel
        billing={billingData}
        payrollRunsUsed={adminData?.payrollSnapshot ? 1 : 0}
        title="Subscription health"
        subtitle="Plan status, seat utilization, and renewal risk"
      />

      <DashboardPanel title="Executive quick actions" subtitle="Common admin workflows">
        <QuickActionGrid
          actions={[
            ...(peopleHref ? [{ label: "Employee Directory", href: peopleHref, caption: "Headcount and profiles" }] : []),
            ...(payrollEnabled && allowedRouteSet.has("/app/payroll") ? [{ label: "Payroll Runs", href: "/app/payroll", caption: "Review lifecycle" }] : []),
            ...(payslipsEnabled && allowedRouteSet.has("/app/payslips") ? [{ label: "Payslips", href: "/app/payslips", caption: "Snapshot history" }] : []),
            ...(securityIntelligenceEnabled && allowedRouteSet.has("/app/monitoring") ? [{ label: "Security Monitoring", href: "/app/monitoring", caption: "Tenant signals" }] : [])
          ]}
        />
      </DashboardPanel>

      {securityIntelligenceEnabled ? (
        <DashboardPanel title="Security posture" subtitle="Immutable security telemetry summary" tone="soft">
          <SignalRow
            label="Recent security alerts"
            value={adminData?.securityAlerts.length ?? 0}
            tone={(adminData?.securityAlerts.length ?? 0) > 0 ? "warning" : "success"}
          />
          <SignalRow label="Auth rate limiting" value="Active" tone="success" />
          <SignalRow label="Risk scoring" value="Enabled" tone="info" />
          <SignalRow label="Audit immutability" value="Enforced" tone="success" />
        </DashboardPanel>
      ) : (
        <DashboardPanel title="Security posture" subtitle="Feature not enabled" tone="soft">
          <p className="muted">Security intelligence indicators are disabled for this plan.</p>
        </DashboardPanel>
      )}

      {!adminData ? (
        <DashboardPanel title="Admin summary" subtitle="Data unavailable" tone="soft">
          <p className="muted">Admin overview data is currently unavailable.</p>
        </DashboardPanel>
      ) : null}

      {!billingData ? (
        <DashboardPanel title="Billing summary" subtitle="Data unavailable" tone="soft">
          <p className="muted">Billing scope is temporarily unavailable.</p>
          {allowedRouteSet.has("/app/billing") ? <div className="row" style={{ justifyContent: "flex-end" }}>
            <Link href="/app/billing" className="secondary-btn">Open billing</Link>
          </div> : null}
        </DashboardPanel>
      ) : null}
    </div>
  );
}
