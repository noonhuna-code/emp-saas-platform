"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchBillingOverview, fetchMonitoringOverview } from "@/lib/client/api";
import type { BillingOverview } from "@/lib/types/billing";
import type { MonitoringOverview } from "@/lib/types/monitoring";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import {
  ChartPanel,
  DashboardHero,
  DashboardKpiTile,
  DashboardModeSwitch,
  DashboardSection,
  QuickActionGrid,
  SignalRow,
  WorkflowPanel,
  type DashboardView
} from "@/components/dashboard/DashboardPrimitives";

export const ITDashboard = () => {
  const [monitoring, setMonitoring] = useState<MonitoringOverview | null>(null);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("workspace");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all([fetchMonitoringOverview(), fetchBillingOverview()])
      .then(([monitoringResult, billingResult]) => {
        if (!active) return;

        if (!monitoringResult.ok || !monitoringResult.data) {
          setError(monitoringResult.error ?? "Unable to load IT dashboard");
          return;
        }

        setMonitoring(monitoringResult.data);
        setBilling(billingResult.ok ? billingResult.data ?? null : null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load IT dashboard");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const securityPressure = useMemo(() => {
    if (!monitoring) {
      return {
        breaches: 0,
        conflicts: 0,
        approvalFailures: 0,
        health: "unknown"
      } as const;
    }

    const breaches = monitoring.rateLimitBreaches.length;
    const conflicts = monitoring.idempotencyConflicts.reduce((sum, row) => sum + row.count, 0);
    const approvalFailures = monitoring.approvalFailures.reduce((sum, row) => sum + row.count, 0);
    const riskScore = breaches + conflicts + approvalFailures;

    return {
      breaches,
      conflicts,
      approvalFailures,
      health: riskScore > 15 ? "degraded" : riskScore > 5 ? "watch" : "healthy"
    } as const;
  }, [monitoring]);

  if (loading) return <LoadingState label="Loading IT dashboard..." />;
  if (error || !monitoring) return <ErrorState message={error ?? "IT dashboard unavailable"} />;

  return (
    <div className="page-wrap space-y-8 fade-in">
      <DashboardHero
        eyebrow="IT Workspace"
        title="Security and system operations"
        subtitle="Monitor tenant-safe security pressure, request integrity conflicts, and operational risk signals in one read-only IT view."
        emphasis="operations"
        actions={(
          <>
            <Link href="/app/monitoring" className="primary-btn">Monitoring</Link>
            <Link href="/app/notifications" className="secondary-btn">Notifications</Link>
            <Link href="/app/billing" className="secondary-btn">License usage</Link>
          </>
        )}
      />

      <DashboardModeSwitch
        value={view}
        onChange={setView}
        title="Workspace lenses"
        subtitle="Shift between IT operations, monitoring summaries, and system response paths without losing platform context."
      />

      <DashboardSection visible={view === "workspace"}>
        <div className="dashboard-kpi-grid">
          <DashboardKpiTile label="System health" value={securityPressure.health} hint="Derived from live monitoring signals" accent={securityPressure.health === "healthy" ? "success" : "warning"} />
          <DashboardKpiTile label="Rate-limit breaches" value={securityPressure.breaches} hint="Last 24h threshold exceedances" accent={securityPressure.breaches > 0 ? "warning" : "success"} />
          <DashboardKpiTile label="Integrity conflicts" value={securityPressure.conflicts} hint="Idempotency collisions" accent={securityPressure.conflicts > 0 ? "warning" : "success"} />
          <DashboardKpiTile label="Approval failures" value={securityPressure.approvalFailures} hint="Workflow error pressure" accent={securityPressure.approvalFailures > 0 ? "danger" : "success"} />
          <DashboardKpiTile
            label="Active licenses"
            value={billing ? `${billing.seatSummary.activeBillable}` : "-"}
            hint={billing?.seatSummary.seatLimit ? `of ${billing.seatSummary.seatLimit}` : "custom plan"}
            accent="info"
          />
        </div>

        <WorkflowPanel title="Access and operations" subtitle="IT actions and review paths">
          <QuickActionGrid
            actions={[
              { label: "Monitoring center", href: "/app/monitoring", caption: "Security and SLA signals" },
              { label: "Approval queue", href: "/app/approvals", caption: "Operational blockers" },
              { label: "Notifications", href: "/app/notifications", caption: "System events" },
              { label: "Billing licenses", href: "/app/billing", caption: "Seat and license counts" }
            ]}
          />
        </WorkflowPanel>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        <ChartPanel title="Security event summary" subtitle="Most recent monitoring snapshot">
          <SignalRow label="Generated at" value={monitoring.generated_at} />
          <SignalRow label="Rate-limit events" value={monitoring.rateLimitBreaches.length} tone={monitoring.rateLimitBreaches.length > 0 ? "warning" : "success"} />
          <SignalRow label="Conflict endpoints" value={monitoring.idempotencyConflicts.length} tone={monitoring.idempotencyConflicts.length > 0 ? "warning" : "success"} />
          <SignalRow label="Approval failure endpoints" value={monitoring.approvalFailures.length} tone={monitoring.approvalFailures.length > 0 ? "danger" : "success"} />
        </ChartPanel>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <WorkflowPanel title="Response paths" subtitle="Fast routes for incidents, access, and tenant health checks">
          <QuickActionGrid
            actions={[
              { label: "Monitoring center", href: "/app/monitoring", caption: "Security and system telemetry" },
              { label: "Notification queue", href: "/app/notifications", caption: "Delivery and incident alerts" },
              { label: "Employee access", href: "/app/employees", caption: "Identity and assignment context" },
              { label: "Billing / seats", href: "/app/billing", caption: "License and seat posture" }
            ]}
          />
          <SignalRow label="Monitoring generated" value={monitoring.generated_at} />
          <SignalRow label="Current health" value={securityPressure.health} tone={securityPressure.health === "healthy" ? "success" : "warning"} />
        </WorkflowPanel>
      </DashboardSection>
    </div>
  );
};

