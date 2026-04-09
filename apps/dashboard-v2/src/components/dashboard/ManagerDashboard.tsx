"use client";

import Link from "next/link";
import { Suspense, lazy, useEffect, useState } from "react";
import { DashboardPerfMarker, useDashboardPerf } from "@/components/dashboard/useDashboardPerf";
import { DashboardWidgetBoundary } from "@/components/dashboard/DashboardWidgetBoundary";
import {
  ChartPanel,
  DashboardScaffold,
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

const routeSet = (allowedRoutes: string[]) => new Set(allowedRoutes);

export const ManagerDashboard = ({
  allowedRoutes = [],
  canViewTeamAttendance = false,
  canReviewLeave = false,
}: {
  allowedRoutes?: string[];
  canViewTeamAttendance?: boolean;
  canReviewLeave?: boolean;
}) => {
  const [view, setView] = useState<DashboardView>("workspace");
  const perf = useDashboardPerf("manager");
  const allowedRouteSet = routeSet(allowedRoutes);
  const peopleHref = allowedRouteSet.has("/app/people")
    ? "/app/people"
    : allowedRouteSet.has("/app/employees")
      ? "/app/employees"
      : null;
  const hasEmployees = Boolean(peopleHref);
  const hasProjects = allowedRouteSet.has("/app/projects");
  const hasShiftSwaps = allowedRouteSet.has("/app/attendance/shift-swaps");

  const heroActions = [
    canViewTeamAttendance ? { href: "/app/attendance/team", label: "Team Attendance", tone: "primary" as const } : null,
    allowedRouteSet.has("/app/approvals") ? { href: "/app/approvals", label: "Approvals", tone: "primary" as const } : null,
    canReviewLeave ? { href: "/app/leave/review", label: "Leave Review", tone: "secondary" as const } : null,
    hasShiftSwaps ? { href: "/app/attendance/shift-swaps", label: "Shift Swaps", tone: "secondary" as const } : null,
    hasProjects ? { href: "/app/projects", label: "Projects", tone: "secondary" as const } : null,
    hasEmployees ? { href: peopleHref!, label: "People Directory", tone: "secondary" as const } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; tone: "primary" | "secondary" }>;

  const actionPaths = [
    canViewTeamAttendance ? { label: "Team attendance", href: "/app/attendance/team", caption: "Presence and late marks" } : null,
    allowedRouteSet.has("/app/approvals") ? { label: "Approvals queue", href: "/app/approvals", caption: "Leave and corrections" } : null,
    canReviewLeave ? { label: "Leave review", href: "/app/leave/review", caption: "Approve, reject, or cancel" } : null,
    hasShiftSwaps ? { label: "Shift swaps", href: "/app/attendance/shift-swaps", caption: "Requests and review queue" } : null,
    hasEmployees ? { label: "People directory", href: peopleHref!, caption: "Direct reports and profiles" } : null,
    hasProjects ? { label: "Projects", href: "/app/projects", caption: "Execution and staffing" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;

  useEffect(() => {
    perf.markKpiRendered();
  }, [perf]);

  return (
    <DashboardScaffold
      eyebrow="Manager Workspace"
      title="Team operations control center"
      subtitle="Monitor team attendance coverage, approvals, staffing pressure, and execution signals with the routes you can act on now."
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
      modeSubtitle="Move between team execution, trend reading, and approval workflow context without losing operational focus."
    >

      <DashboardSection visible={view === "workspace"}>
        <section className="space-y-4">
          <ManagerKpiWidget variant="manager" />
        </section>

        <section className="space-y-4">
          <Suspense fallback={<div className="grid-2"><SkeletonCard rows={6} /><SkeletonChart /></div>}>
            <DashboardWidgetBoundary title="Manager operations" message="Manager operations are temporarily unavailable.">
              <ManagerOperationsWidget
                variant="manager"
                allowedRoutes={allowedRoutes}
                canViewTeamAttendance={canViewTeamAttendance}
              />
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
                <ManagerOperationsWidget
                  variant="manager"
                  allowedRoutes={allowedRoutes}
                  canViewTeamAttendance={canViewTeamAttendance}
                />
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
                <ManagerWorkflowWidget
                  variant="manager"
                  peopleHref={peopleHref}
                />
              </DashboardWidgetBoundary>
            </Suspense>
          </WorkflowPanel>
          <WorkflowPanel title="Manager action paths" subtitle="Fast routes into the surfaces that affect team delivery most">
            <QuickActionGrid actions={actionPaths} />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Operating scope" subtitle="What this manager surface is optimized for">
          <p className="muted">
            Managers get direct coverage, approval pressure, team attendance visibility, and fast navigation into the workstreams that can block execution.
          </p>
        </DashboardPanel>
      </DashboardSection>
    </DashboardScaffold>
  );
};
