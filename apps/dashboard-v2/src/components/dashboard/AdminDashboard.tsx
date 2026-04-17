"use client";

import Link from "next/link";
import { Suspense, lazy, useEffect, useState } from "react";
import { HRDashboard } from "@/components/dashboard/HRDashboard";
import { ITDashboard } from "@/components/dashboard/ITDashboard";
import { syncRoleWorkspaceModules } from "@/components/dashboard/roleModuleSync";
import { DashboardPerfMarker, useDashboardPerf } from "@/components/dashboard/useDashboardPerf";
import { DashboardWidgetBoundary } from "@/components/dashboard/DashboardWidgetBoundary";
import {
  ChartPanel,
  DashboardModuleDeck,
  DashboardScaffold,
  DashboardPanel,
  QuickActionGrid,
  DashboardSection,
  WorkflowPanel,
  type DashboardView
} from "@/components/dashboard/DashboardPrimitives";
import { SkeletonCard, SkeletonChart, SkeletonList } from "@/components/ui/SkeletonBlocks";
import AdminKpiWidget from "@/components/dashboard/widgets/AdminKpiWidget";

const AdminAnalyticsWidget = lazy(() => import("@/components/dashboard/widgets/AdminAnalyticsWidget"));
const AdminOperationsWidget = lazy(() => import("@/components/dashboard/widgets/AdminOperationsWidget"));
const AdminSecurityWidget = lazy(() => import("@/components/dashboard/widgets/AdminSecurityWidget"));
const AdminDepartmentWidget = lazy(() => import("@/components/dashboard/widgets/AdminDepartmentWidget"));

export const AdminDashboard = ({
  mode = "admin",
  allowedRoutes = [],
  canReviewLeave = false,
}: {
  mode?: "admin" | "hr" | "it";
  allowedRoutes?: string[];
  canReviewLeave?: boolean;
}) => {
  if (mode === "hr") {
    return <HRDashboard allowedRoutes={allowedRoutes} canReviewLeave={canReviewLeave} />;
  }

  if (mode === "it") {
    return <ITDashboard allowedRoutes={allowedRoutes} />;
  }

  return <AdminDashboardCore allowedRoutes={allowedRoutes} />;
};

const AdminDashboardCore = ({
  allowedRoutes = [],
}: {
  allowedRoutes?: string[];
}) => {
  const [view, setView] = useState<DashboardView>("workspace");
  const perf = useDashboardPerf("admin");
  const allowedRouteSet = new Set(allowedRoutes);
  const peopleHref = allowedRouteSet.has("/app/people")
    ? "/app/people"
    : allowedRouteSet.has("/app/employees")
      ? "/app/employees"
      : null;
  const heroActions = [
    peopleHref ? { href: peopleHref, label: "Employees", tone: "secondary" as const } : null,
    allowedRouteSet.has("/app/payroll") ? { href: "/app/payroll", label: "Payroll", tone: "secondary" as const } : null,
    allowedRouteSet.has("/app/billing") ? { href: "/app/billing", label: "Billing", tone: "secondary" as const } : null,
    allowedRouteSet.has("/app/monitoring") ? { href: "/app/monitoring", label: "Monitoring", tone: "secondary" as const } : null,
    allowedRouteSet.has("/app/approvals") ? { href: "/app/approvals", label: "Approvals", tone: "primary" as const } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; tone: "primary" | "secondary" }>;
  const commandPaths = [
    peopleHref ? { label: "People directory", href: peopleHref, caption: "Records, roles, and reporting" } : null,
    allowedRouteSet.has("/app/organization") ? { label: "Organization", href: "/app/organization", caption: "Structure and assignments" } : null,
    allowedRouteSet.has("/app/approvals") ? { label: "Approvals queue", href: "/app/approvals", caption: "Pending decisions" } : null,
    allowedRouteSet.has("/app/billing") ? { label: "Billing console", href: "/app/billing", caption: "Invoices, seats, and proofs" } : null,
    allowedRouteSet.has("/app/monitoring") ? { label: "System monitor", href: "/app/monitoring", caption: "Security and health" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;
  const workspaceModules = [
    peopleHref
      ? {
          title: "People and organization control",
          description: "Move through employee records, reporting structure, and role-sensitive headcount views from one admin lane.",
          href: peopleHref,
          label: "People ops",
          metric: peopleHref === "/app/people" ? "Directory" : "Records",
          highlights: ["Profiles", "Hierarchy", "Assignments"]
        }
      : null,
    allowedRouteSet.has("/app/approvals")
      ? {
          title: "Approvals and workflow pressure",
          description: "Stay close to the queues that block leave, attendance, and downstream operations before backlog grows.",
          href: "/app/approvals",
          label: "Workflow",
          metric: "Queue ready",
          highlights: ["Leave review", "Corrections", "Exceptions"]
        }
      : null,
    allowedRouteSet.has("/app/monitoring")
      ? {
          title: "Governance and monitoring",
          description: "Keep security, operational health, and tenant-wide control signals close to the admin surface.",
          href: "/app/monitoring",
          label: "Controls",
          metric: "Live",
          highlights: ["Security", "Health", "Auditability"]
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; description: string; href: string; label?: string; metric?: string; highlights?: string[] }>;
  const syncedWorkspaceModules = syncRoleWorkspaceModules({
    baseModules: workspaceModules,
    allowedRoutes: allowedRouteSet,
    preferredRoutes: ["/app/organization", "/app/payroll", "/app/settings", "/app/notifications", "/app/resources", "/app/analytics"],
  });
  const heroSignals = [
    { label: "People ops", value: peopleHref ? "Directory live" : "Scoped" },
    { label: "Control", value: allowedRouteSet.has("/app/monitoring") ? "Security enabled" : "Core ops" },
    { label: "Lanes", value: `${commandPaths.length} active` }
  ];

  useEffect(() => {
    perf.markKpiRendered();
  }, [perf]);

  return (
    <DashboardScaffold
        eyebrow="Admin Workspace"
        title="Company operations and governance overview"
        subtitle="Tenant-scoped headcount, attendance, leave utilization, payroll snapshot, and recent security alerts."
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
        modeTitle="Workspace lenses"
        modeSubtitle="Move between company operations, analysis, and governance without leaving the admin command surface."
      >

      <DashboardSection visible={view === "workspace"}>
        <section className="space-y-4">
          <AdminKpiWidget />
        </section>

        {syncedWorkspaceModules.length > 0 ? (
          <DashboardPanel title="Workspace modules" subtitle="TailAdmin-style entry lanes for the admin controls you use most.">
            <DashboardModuleDeck modules={syncedWorkspaceModules} />
          </DashboardPanel>
        ) : null}

        <section className="space-y-4">
          <Suspense fallback={<div className="grid-3"><SkeletonCard rows={5} /><SkeletonCard rows={6} /><SkeletonCard rows={5} /></div>}>
            <DashboardWidgetBoundary title="Admin operations" message="Admin operational widgets are temporarily unavailable.">
              <AdminOperationsWidget allowedRoutes={allowedRoutes} />
            </DashboardWidgetBoundary>
          </Suspense>
        </section>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartPanel title="Workforce analytics" subtitle="Attendance, leave, and payroll analytics">
            <Suspense fallback={<SkeletonChart />}>
              <DashboardWidgetBoundary title="Workforce analytics" message="Analytics are temporarily unavailable.">
                <>
                  <DashboardPerfMarker onReady={perf.markChartsLoaded} />
                  <AdminAnalyticsWidget />
                </>
              </DashboardWidgetBoundary>
            </Suspense>
          </ChartPanel>
          <ChartPanel title="Department analytics" subtitle="Headcount and trend breakdown">
            <Suspense fallback={<div className="grid-2"><SkeletonChart /><SkeletonCard rows={6} /></div>}>
              <DashboardWidgetBoundary title="Department analytics" message="Department analytics are temporarily unavailable.">
                <AdminDepartmentWidget />
              </DashboardWidgetBoundary>
            </Suspense>
          </ChartPanel>
        </div>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkflowPanel title="Security and workflow" subtitle="Operational risks and queue health">
            <Suspense fallback={<div className="grid-2"><SkeletonCard rows={5} /><SkeletonList rows={6} /></div>}>
              <DashboardWidgetBoundary title="Security and workflow" message="Security workflow data is temporarily unavailable.">
                <AdminSecurityWidget allowedRoutes={allowedRoutes} />
              </DashboardWidgetBoundary>
            </Suspense>
          </WorkflowPanel>
          <WorkflowPanel title="Command paths" subtitle="Most-used operating routes for people, billing, and controls">
            <QuickActionGrid actions={commandPaths} />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Operating scope" subtitle="What this workspace covers right now">
          <p className="muted">
            This surface stays focused on live company operations, governance signals, people oversight, and the queues that need action first.
          </p>
        </DashboardPanel>
      </DashboardSection>
    </DashboardScaffold>
  );
};
