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
import ManagerKpiWidget from "@/components/dashboard/widgets/ManagerKpiWidget";

const ManagerOperationsWidget = lazy(() => import("@/components/dashboard/widgets/ManagerOperationsWidget"));
const ManagerWorkflowWidget = lazy(() => import("@/components/dashboard/widgets/ManagerWorkflowWidget"));

export const ManagerDashboard = () => {
  const [view, setView] = useState<DashboardView>("workspace");
  const perf = useDashboardPerf("manager");

  useEffect(() => {
    perf.markKpiRendered();
  }, [perf]);

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

      <DashboardModeSwitch
        value={view}
        onChange={setView}
        title="Workspace lenses"
        subtitle="Move between team execution, trend reading, and approval workflow context without losing operational focus."
      />

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
          <WorkflowPanel title="Manager action paths" subtitle="Fast routes into the surfaces that affect team delivery most">
            <QuickActionGrid
              actions={[
                { label: "Team attendance", href: "/app/attendance/team", caption: "Presence and late marks" },
                { label: "Approvals queue", href: "/app/approvals", caption: "Leave and corrections" },
                { label: "People directory", href: "/app/employees", caption: "Direct reports and profiles" },
                { label: "Projects", href: "/app/projects", caption: "Execution and staffing" }
              ]}
            />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Operating scope" subtitle="What this manager surface is optimized for">
          <p className="muted">
            Managers get direct coverage, approval pressure, team attendance visibility, and fast navigation into the workstreams that can block execution.
          </p>
        </DashboardPanel>
      </DashboardSection>
    </div>
  );
};
