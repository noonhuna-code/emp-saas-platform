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

const ManagerKpiWidget = lazy(() => import("@/components/dashboard/widgets/ManagerKpiWidget"));
const ManagerOperationsWidget = lazy(() => import("@/components/dashboard/widgets/ManagerOperationsWidget"));
const ManagerWorkflowWidget = lazy(() => import("@/components/dashboard/widgets/ManagerWorkflowWidget"));

export const TeamLeadDashboard = () => {
  const [view, setView] = useState<DashboardView>("workspace");

  const activityItems = useMemo(
    () => [
      {
        id: "teamlead-1",
        title: "Daily shift board refreshed",
        description: "Today’s assigned employees and attendance records have been updated.",
        timestamp: "Now"
      },
      {
        id: "teamlead-2",
        title: "Shift swap request pending",
        description: "A team member requested a swap and needs review routing.",
        timestamp: "4 min ago"
      },
      {
        id: "teamlead-3",
        title: "Correction queue updated",
        description: "Attendance corrections are ready for validation.",
        timestamp: "9 min ago"
      }
    ],
    []
  );

  return (
    <div className="page-wrap space-y-8 fade-in">
      <DashboardHero
        eyebrow="Team Lead Workspace"
        title="Daily team coordination"
        subtitle="Read-only operational view for attendance coverage, pending approvals, and direct report navigation."
        emphasis="operations"
        actions={(
          <>
            <Link href="/app/attendance/team" className="primary-btn">Team Attendance</Link>
            <Link href="/app/approvals" className="secondary-btn">Approvals</Link>
            <Link href="/app/employees" className="secondary-btn">Directory</Link>
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
              </div>
            )}
          >
            <ManagerKpiWidget variant="team_lead" />
          </Suspense>
        </section>

        <section className="space-y-4">
          <Suspense fallback={<div className="grid-2"><SkeletonCard rows={6} /><SkeletonChart /></div>}>
            <ManagerOperationsWidget variant="team_lead" />
          </Suspense>
        </section>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        <ChartPanel title="Team analytics" subtitle="Coverage and reliability signal view">
          <Suspense fallback={<div className="grid-2"><SkeletonCard rows={6} /><SkeletonChart /></div>}>
            <ManagerOperationsWidget variant="team_lead" />
          </Suspense>
        </ChartPanel>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkflowPanel title="Team workflow" subtitle="Review queue and pending actions">
            <Suspense fallback={<div className="grid-2"><SkeletonList rows={6} /><SkeletonList rows={6} /></div>}>
              <ManagerWorkflowWidget variant="team_lead" />
            </Suspense>
          </WorkflowPanel>
          <WorkflowPanel title="Activity feed" subtitle="Latest team-lead actions">
            <ActivityFeed items={activityItems} />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Performance profile" subtitle="Independent widgets render progressively">
          <p className="muted">
            Team lead widgets resolve independently for faster first paint and non-blocking dashboard rendering.
          </p>
        </DashboardPanel>
      </DashboardSection>
    </div>
  );
};

