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

export const TeamLeadDashboard = () => {
  const [view, setView] = useState<DashboardView>("workspace");
  const perf = useDashboardPerf("team_lead");

  useEffect(() => {
    perf.markKpiRendered();
  }, [perf]);

  return (
    <div className="page-wrap space-y-8 fade-in">
      <DashboardHero
        eyebrow="Team Lead Workspace"
        title="Daily team coordination"
        subtitle="Keep frontline coverage, approvals, and direct-report context in one action-ready team lead desk."
        emphasis="operations"
        actions={(
          <>
            <Link href="/app/attendance/team" className="primary-btn">Team Attendance</Link>
            <Link href="/app/approvals" className="secondary-btn">Approvals</Link>
            <Link href="/app/employees" className="secondary-btn">Directory</Link>
          </>
        )}
      />

      <DashboardModeSwitch
        value={view}
        onChange={setView}
        title="Workspace lenses"
        subtitle="Switch between frontline coverage, team-level trends, and review queues without leaving your operating desk."
      />

      <DashboardSection visible={view === "workspace"}>
        <section className="space-y-4">
          <ManagerKpiWidget variant="team_lead" />
        </section>

        <section className="space-y-4">
          <Suspense fallback={<div className="grid-2"><SkeletonCard rows={6} /><SkeletonChart /></div>}>
            <DashboardWidgetBoundary title="Team lead operations" message="Team operations are temporarily unavailable.">
              <ManagerOperationsWidget variant="team_lead" />
            </DashboardWidgetBoundary>
          </Suspense>
        </section>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        <ChartPanel title="Team analytics" subtitle="Coverage and reliability signal view">
          <Suspense fallback={<div className="grid-2"><SkeletonCard rows={6} /><SkeletonChart /></div>}>
            <DashboardWidgetBoundary title="Team analytics" message="Analytics are temporarily unavailable.">
              <>
                <DashboardPerfMarker onReady={perf.markChartsLoaded} />
                <ManagerOperationsWidget variant="team_lead" />
              </>
            </DashboardWidgetBoundary>
          </Suspense>
        </ChartPanel>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkflowPanel title="Team workflow" subtitle="Review queue and pending actions">
            <Suspense fallback={<div className="grid-2"><SkeletonList rows={6} /><SkeletonList rows={6} /></div>}>
              <DashboardWidgetBoundary title="Team workflow" message="Workflow data is temporarily unavailable.">
                <ManagerWorkflowWidget variant="team_lead" />
              </DashboardWidgetBoundary>
            </Suspense>
          </WorkflowPanel>
          <WorkflowPanel title="Team lead action paths" subtitle="Fast routes for shifts, swaps, approvals, and direct report context">
            <QuickActionGrid
              actions={[
                { label: "Team attendance", href: "/app/attendance/team", caption: "Coverage and late marks" },
                { label: "Shift swaps", href: "/app/attendance/shift-swaps", caption: "Requests and decisions" },
                { label: "Approvals queue", href: "/app/approvals", caption: "Operational blockers" },
                { label: "Team chat", href: "/app/chat", caption: "Coordination and updates" }
              ]}
            />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Operating scope" subtitle="What this desk is built to resolve quickly">
          <p className="muted">
            Team leads stay focused on today&apos;s coverage, swap requests, attendance corrections, and the direct-report context needed to keep frontline work moving.
          </p>
        </DashboardPanel>
      </DashboardSection>
    </div>
  );
};
