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
  DashboardModuleDeck,
  DashboardScaffold,
  DashboardKpiTile,
  DashboardSection,
  QuickActionGrid,
  SignalRow,
  WorkflowPanel,
  type DashboardView
} from "@/components/dashboard/DashboardPrimitives";

const EMPTY_MONITORING_OVERVIEW: MonitoringOverview = {
  rateLimitBreaches: [],
  idempotencyConflicts: [],
  approvalFailures: [],
  generated_at: "-"
};

export const ITDashboard = ({
  allowedRoutes = [],
}: {
  allowedRoutes?: string[];
}) => {
  const [monitoring, setMonitoring] = useState<MonitoringOverview>(EMPTY_MONITORING_OVERVIEW);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("workspace");
  const allowedRouteSet = useMemo(() => new Set(allowedRoutes), [allowedRoutes]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.allSettled([fetchMonitoringOverview(), fetchBillingOverview()])
      .then(([monitoringSettled, billingSettled]) => {
        if (!active) return;

        const monitoringResult = monitoringSettled.status === "fulfilled" ? monitoringSettled.value : null;
        const billingResult = billingSettled.status === "fulfilled" ? billingSettled.value : null;

        setMonitoring(monitoringResult?.ok && monitoringResult.data ? monitoringResult.data : EMPTY_MONITORING_OVERVIEW);
        setBilling(billingResult?.ok ? billingResult.data ?? null : null);

        if (!monitoringResult?.ok || !monitoringResult.data) {
          setError(monitoringResult?.error ?? "Unable to load IT dashboard");
          return;
        }

        setError(null);
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

  const heroActions = [
    allowedRouteSet.has("/app/monitoring") ? { href: "/app/monitoring", label: "Monitoring", tone: "primary" as const } : null,
    allowedRouteSet.has("/app/notifications") ? { href: "/app/notifications", label: "Notifications", tone: "secondary" as const } : null,
    allowedRouteSet.has("/app/billing") ? { href: "/app/billing", label: "License usage", tone: "secondary" as const } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; tone: "primary" | "secondary" }>;

  const accessActions = [
    allowedRouteSet.has("/app/monitoring") ? { label: "Monitoring center", href: "/app/monitoring", caption: "Security and SLA signals" } : null,
    allowedRouteSet.has("/app/approvals") ? { label: "Approval queue", href: "/app/approvals", caption: "Operational blockers" } : null,
    allowedRouteSet.has("/app/notifications") ? { label: "Notifications", href: "/app/notifications", caption: "System events" } : null,
    allowedRouteSet.has("/app/billing") ? { label: "Billing licenses", href: "/app/billing", caption: "Seat and license counts" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;
  const peopleHref = allowedRouteSet.has("/app/people")
    ? "/app/people"
    : allowedRouteSet.has("/app/employees")
      ? "/app/employees"
      : null;

  const responseActions = [
    allowedRouteSet.has("/app/monitoring") ? { label: "Monitoring center", href: "/app/monitoring", caption: "Security and system telemetry" } : null,
    allowedRouteSet.has("/app/notifications") ? { label: "Notification queue", href: "/app/notifications", caption: "Delivery and incident alerts" } : null,
    peopleHref ? { label: "Employee access", href: peopleHref, caption: "Identity and assignment context" } : null,
    allowedRouteSet.has("/app/billing") ? { label: "Billing / seats", href: "/app/billing", caption: "License and seat posture" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;
  const workspaceModules = [
    allowedRouteSet.has("/app/monitoring")
      ? {
          title: "Monitoring and system posture",
          description: "Open the security and telemetry surface built for incident review, system health, and risk triage.",
          href: "/app/monitoring",
          label: "Monitoring",
          metric: securityPressure.health,
          highlights: ["Security", "Telemetry", "Incidents"]
        }
      : null,
    allowedRouteSet.has("/app/notifications")
      ? {
          title: "Alerts and notification flow",
          description: "Keep delivery issues and system-triggered alerts visible so IT response stays fast and contained.",
          href: "/app/notifications",
          label: "Alerts",
          metric: `${securityPressure.breaches + securityPressure.approvalFailures} watch`,
          highlights: ["Notifications", "Failures", "Escalation"]
        }
      : null,
    (peopleHref || allowedRouteSet.has("/app/billing"))
      ? {
          title: "Identity and license context",
          description: "Use access and seat posture together so workforce changes and system readiness stay connected.",
          href: peopleHref ?? "/app/billing",
          label: "Access",
          metric: billing ? `${billing.seatSummary.activeBillable} seats` : "Scoped",
          highlights: [peopleHref ? "Employee access" : "Seat posture", allowedRouteSet.has("/app/billing") ? "Billing / seats" : "Routing", "Tenant context"]
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; description: string; href: string; label?: string; metric?: string; highlights?: string[] }>;

  if (loading) return <LoadingState label="Loading IT dashboard..." />;
  if (error && monitoring.generated_at === "-") return <ErrorState message={error} />;

  return (
    <DashboardScaffold
        eyebrow="IT Workspace"
        title="Security and system operations"
        subtitle="Monitor tenant-safe security pressure, request integrity conflicts, and operational risk signals in one read-only IT view."
        emphasis="operations"
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
        modeTitle="Workspace lenses"
        modeSubtitle="Shift between IT operations, monitoring summaries, and system response paths without losing platform context."
      >

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

        {workspaceModules.length > 0 ? (
          <ChartPanel title="Workspace modules" subtitle="TailAdmin-style IT entry points for response, monitoring, and license posture.">
            <DashboardModuleDeck modules={workspaceModules} />
          </ChartPanel>
        ) : null}

        <WorkflowPanel title="Access and operations" subtitle="IT actions and review paths">
          <QuickActionGrid actions={accessActions} />
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
          <QuickActionGrid actions={responseActions} />
          <SignalRow label="Monitoring generated" value={monitoring.generated_at} />
          <SignalRow label="Current health" value={securityPressure.health} tone={securityPressure.health === "healthy" ? "success" : "warning"} />
        </WorkflowPanel>
      </DashboardSection>
    </DashboardScaffold>
  );
};
