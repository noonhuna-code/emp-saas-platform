"use client";

import Link from "next/link";
import { Suspense, lazy, useMemo, useState } from "react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import {
  ChartPanel,
  DashboardHero,
  DashboardModeSwitch,
  DashboardPanel,
  DashboardSection,
  WorkflowPanel,
  type DashboardView
} from "@/components/dashboard/DashboardPrimitives";
import { SkeletonCard, SkeletonChart, SkeletonList } from "@/components/ui/SkeletonBlocks";

const AdminKpiWidget = lazy(() => import("@/components/dashboard/widgets/AdminKpiWidget"));
const AdminAnalyticsWidget = lazy(() => import("@/components/dashboard/widgets/AdminAnalyticsWidget"));
const AdminOperationsWidget = lazy(() => import("@/components/dashboard/widgets/AdminOperationsWidget"));
const AdminSecurityWidget = lazy(() => import("@/components/dashboard/widgets/AdminSecurityWidget"));
const AdminDepartmentWidget = lazy(() => import("@/components/dashboard/widgets/AdminDepartmentWidget"));

export const AdminDashboard = () => {
  const [view, setView] = useState<DashboardView>("workspace");

  const activityItems = useMemo(
    () => [
      {
        id: "admin-1",
        title: "Approvals queue reviewed",
        description: "Pending leave and attendance approvals were refreshed.",
        timestamp: "Now"
      },
      {
        id: "admin-2",
        title: "Department stats synced",
        description: "Headcount and attendance distribution updated for dashboards.",
        timestamp: "2 min ago"
      },
      {
        id: "admin-3",
        title: "Security monitor checked",
        description: "Latest monitoring snapshot is available in operations mode.",
        timestamp: "5 min ago"
      }
    ],
    []
  );

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

      <DashboardModeSwitch value={view} onChange={setView} />

      <DashboardSection visible={view === "workspace"}>
        <section className="space-y-4">
          <Suspense
            fallback={(
              <div className="dashboard-kpi-grid">
                <SkeletonCard rows={2} />
                <SkeletonCard rows={2} />
                <SkeletonCard rows={2} />
                <SkeletonCard rows={2} />
                <SkeletonCard rows={2} />
              </div>
            )}
          >
            <AdminKpiWidget />
          </Suspense>
        </section>

        <section className="space-y-4">
          <Suspense fallback={<div className="grid-3"><SkeletonCard rows={5} /><SkeletonCard rows={6} /><SkeletonCard rows={5} /></div>}>
            <AdminOperationsWidget />
          </Suspense>
        </section>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartPanel title="Workforce analytics" subtitle="Attendance, leave, and payroll analytics">
            <Suspense fallback={<SkeletonChart />}>
              <AdminAnalyticsWidget />
            </Suspense>
          </ChartPanel>
          <ChartPanel title="Department analytics" subtitle="Headcount and trend breakdown">
            <Suspense fallback={<div className="grid-2"><SkeletonChart /><SkeletonCard rows={6} /></div>}>
              <AdminDepartmentWidget />
            </Suspense>
          </ChartPanel>
        </div>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkflowPanel title="Security and workflow" subtitle="Operational risks and queue health">
            <Suspense fallback={<div className="grid-2"><SkeletonCard rows={5} /><SkeletonList rows={6} /></div>}>
              <AdminSecurityWidget />
            </Suspense>
          </WorkflowPanel>
          <WorkflowPanel title="Activity feed" subtitle="Recent admin actions">
            <ActivityFeed items={activityItems} />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Rendering mode" subtitle="Progressive dashboard hydration active">
          <p className="muted">
            Widgets render independently with lazy boundaries and cached route payloads to keep the shell interactive.
          </p>
        </DashboardPanel>
      </DashboardSection>
    </div>
  );
};

