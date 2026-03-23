"use client";

import Link from "next/link";
import { Suspense, lazy, useEffect, useState } from "react";
import { DashboardPerfMarker, useDashboardPerf } from "@/components/dashboard/useDashboardPerf";
import { DashboardWidgetBoundary } from "@/components/dashboard/DashboardWidgetBoundary";
import {
  ChartPanel,
  DashboardHero,
  DashboardModeSwitch,
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

export const AdminDashboard = () => {
  const [view, setView] = useState<DashboardView>("workspace");
  const perf = useDashboardPerf("admin");

  useEffect(() => {
    perf.markKpiRendered();
  }, [perf]);

  return (
    <div className="page-wrap space-y-8 fade-in">
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

      <DashboardModeSwitch
        value={view}
        onChange={setView}
        title="Workspace lenses"
        subtitle="Move between company operations, analysis, and governance without leaving the admin command surface."
      />

      <DashboardSection visible={view === "workspace"}>
        <section className="space-y-4">
          <AdminKpiWidget />
        </section>

        <section className="space-y-4">
          <Suspense fallback={<div className="grid-3"><SkeletonCard rows={5} /><SkeletonCard rows={6} /><SkeletonCard rows={5} /></div>}>
            <DashboardWidgetBoundary title="Admin operations" message="Admin operational widgets are temporarily unavailable.">
              <AdminOperationsWidget />
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
                <AdminSecurityWidget />
              </DashboardWidgetBoundary>
            </Suspense>
          </WorkflowPanel>
          <WorkflowPanel title="Command paths" subtitle="Most-used operating routes for people, billing, and controls">
            <QuickActionGrid
              actions={[
                { label: "People directory", href: "/app/employees", caption: "Records, roles, and reporting" },
                { label: "Organization", href: "/app/organization", caption: "Structure and assignments" },
                { label: "Approvals queue", href: "/app/approvals", caption: "Pending decisions" },
                { label: "System monitor", href: "/app/monitoring", caption: "Security and health" }
              ]}
            />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Operating scope" subtitle="What this workspace covers right now">
          <p className="muted">
            This surface stays focused on live company operations, governance signals, people oversight, and the queues that need action first.
          </p>
        </DashboardPanel>
      </DashboardSection>
    </div>
  );
};
