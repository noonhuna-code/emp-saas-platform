"use client";

import Link from "next/link";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardPerfMarker, useDashboardPerf } from "@/components/dashboard/useDashboardPerf";
import { DashboardWidgetBoundary } from "@/components/dashboard/DashboardWidgetBoundary";
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
import ManagerKpiWidget from "@/components/dashboard/widgets/ManagerKpiWidget";

const ManagerOperationsWidget = lazy(() => import("@/components/dashboard/widgets/ManagerOperationsWidget"));
const ManagerWorkflowWidget = lazy(() => import("@/components/dashboard/widgets/ManagerWorkflowWidget"));

export const ManagerDashboard = () => {
  const [view, setView] = useState<DashboardView>("workspace");
  const perf = useDashboardPerf("manager");

  useEffect(() => {
    perf.markKpiRendered();
  }, [perf]);

  const activityItems = useMemo(
    () => [
      {
        id: "manager-1",
        title: "Team attendance synced",
        description: "Latest team presence and leave overlap have been refreshed.",
        timestamp: "Now"
      },
      {
        id: "manager-2",
        title: "Approvals queue updated",
        description: "New pending approvals require your review.",
        timestamp: "3 min ago"
      },
      {
        id: "manager-3",
        title: "Coverage signal recomputed",
        description: "Shift coverage trend recalculated for the operations panel.",
        timestamp: "7 min ago"
      }
    ],
    []
  );

  return (
    <div className="page-wrap space-y-8 fade-in">
      <DashboardHero
        eyebrow="Manager Workspace"
        title="Team operations control center"
        subtitle="Monitor team attendance coverage, pending approvals, and reliability trends with read-only manager summaries."
        emphasis="operations"
        actions={(
          <>
            <Link href="/app/approvals" className="primary-btn">Approvals</Link>
            <Link href="/app/attendance/team" className="secondary-btn">Team Attendance</Link>
            <Link href="/app/employees" className="secondary-btn">Employee Directory</Link>
          </>
        )}
      />

      <DashboardModeSwitch value={view} onChange={setView} />

      <DashboardSection visible={view === "workspace"}>
        <section className="space-y-4">
          <ManagerKpiWidget variant="manager" />
        </section>

        <section className="space-y-4">
          <Suspense fallback={<div className="grid-2"><SkeletonCard rows={6} /><SkeletonChart /></div>}>
            <DashboardWidgetBoundary title="Manager operations" message="Manager operations are temporarily unavailable.">
              <ManagerOperationsWidget variant="manager" />
            </DashboardWidgetBoundary>
          </Suspense>
        </section>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        <ChartPanel title="Team performance analytics" subtitle="Attendance momentum and reliability curves">
          <Suspense fallback={<div className="grid-2"><SkeletonCard rows={6} /><SkeletonChart /></div>}>
            <DashboardWidgetBoundary title="Team analytics" message="Analytics are temporarily unavailable.">
              <>
                <DashboardPerfMarker onReady={perf.markChartsLoaded} />
                <ManagerOperationsWidget variant="manager" />
              </>
            </DashboardWidgetBoundary>
          </Suspense>
        </ChartPanel>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkflowPanel title="Workflow queue" subtitle="Pending approvals and exceptions">
            <Suspense fallback={<div className="grid-2"><SkeletonList rows={6} /><SkeletonList rows={6} /></div>}>
              <DashboardWidgetBoundary title="Workflow queue" message="Workflow data is temporarily unavailable.">
                <ManagerWorkflowWidget variant="manager" />
              </DashboardWidgetBoundary>
            </Suspense>
          </WorkflowPanel>
          <WorkflowPanel title="Activity feed" subtitle="Recent manager events">
            <ActivityFeed items={activityItems} />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Performance profile" subtitle="Independent widgets render progressively">
          <p className="muted">
            Team KPIs render immediately while operational widgets and review timelines resolve independently.
          </p>
        </DashboardPanel>
      </DashboardSection>
    </div>
  );
};
