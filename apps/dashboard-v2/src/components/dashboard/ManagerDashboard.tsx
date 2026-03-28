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

const routeSet = (allowedRoutes: string[]) => new Set(allowedRoutes);

export const ManagerDashboard = ({
  mode = "manager",
  allowedRoutes = [],
  canViewTeamAttendance = false,
  canReviewLeave = false,
}: {
  mode?: "manager" | "team_lead";
  allowedRoutes?: string[];
  canViewTeamAttendance?: boolean;
  canReviewLeave?: boolean;
}) => {
  const [view, setView] = useState<DashboardView>("workspace");
  const perf = useDashboardPerf(mode === "team_lead" ? "team_lead" : "manager");
  const allowedRouteSet = routeSet(allowedRoutes);
  const isTeamLeadMode = mode === "team_lead";
  const hasEmployees = allowedRouteSet.has("/app/employees");
  const hasProjects = allowedRouteSet.has("/app/projects");
  const hasChat = allowedRouteSet.has("/app/chat");
  const hasShiftSwaps = allowedRouteSet.has("/app/attendance/shift-swaps");

  const heroActions = [
    canViewTeamAttendance ? { href: "/app/attendance/team", label: "Team Attendance", tone: "primary" as const } : null,
    allowedRouteSet.has("/app/approvals") ? { href: "/app/approvals", label: "Approvals", tone: isTeamLeadMode ? "secondary" as const : "primary" as const } : null,
    canReviewLeave ? { href: "/app/leave/review", label: "Leave Review", tone: "secondary" as const } : null,
    hasShiftSwaps ? { href: "/app/attendance/shift-swaps", label: "Shift Swaps", tone: "secondary" as const } : null,
    isTeamLeadMode && hasChat ? { href: "/app/chat", label: "Team Chat", tone: "secondary" as const } : null,
    !isTeamLeadMode && hasProjects ? { href: "/app/projects", label: "Projects", tone: "secondary" as const } : null,
    hasEmployees ? { href: "/app/employees", label: isTeamLeadMode ? "Employee Directory" : "People Directory", tone: "secondary" as const } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; tone: "primary" | "secondary" }>;

  const actionPaths = [
    canViewTeamAttendance ? { label: "Team attendance", href: "/app/attendance/team", caption: "Presence and late marks" } : null,
    allowedRouteSet.has("/app/approvals") ? { label: "Approvals queue", href: "/app/approvals", caption: "Leave and corrections" } : null,
    canReviewLeave ? { label: "Leave review", href: "/app/leave/review", caption: "Approve, reject, or cancel" } : null,
    hasShiftSwaps ? { label: "Shift swaps", href: "/app/attendance/shift-swaps", caption: "Requests and review queue" } : null,
    isTeamLeadMode && hasChat ? { label: "Team chat", href: "/app/chat", caption: "Coordination and updates" } : null,
    hasEmployees ? { label: isTeamLeadMode ? "Employee directory" : "People directory", href: "/app/employees", caption: "Direct reports and profiles" } : null,
    !isTeamLeadMode && hasProjects ? { label: "Projects", href: "/app/projects", caption: "Execution and staffing" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;

  useEffect(() => {
    perf.markKpiRendered();
  }, [perf]);

  return (
    <div className="page-wrap space-y-8 fade-in">
      <DashboardHero
        eyebrow={isTeamLeadMode ? "Team Lead Workspace" : "Manager Workspace"}
        title={isTeamLeadMode ? "Frontline team coordination" : "Team operations control center"}
        subtitle={
          isTeamLeadMode
            ? "Keep assigned teams aligned on attendance, approvals, team chat, and daily delivery without widening into admin-only controls."
            : "Monitor team attendance coverage, approvals, staffing pressure, and execution signals with the routes you can act on now."
        }
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
      />

      <DashboardModeSwitch
        value={view}
        onChange={setView}
        title="Workspace lenses"
        subtitle="Move between team execution, trend reading, and approval workflow context without losing operational focus."
      />

      <DashboardSection visible={view === "workspace"}>
        <section className="space-y-4">
          <ManagerKpiWidget variant={isTeamLeadMode ? "team_lead" : "manager"} />
        </section>

        <section className="space-y-4">
          <Suspense fallback={<div className="grid-2"><SkeletonCard rows={6} /><SkeletonChart /></div>}>
            <DashboardWidgetBoundary title="Manager operations" message="Manager operations are temporarily unavailable.">
              <ManagerOperationsWidget
                variant={isTeamLeadMode ? "team_lead" : "manager"}
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
                  variant={isTeamLeadMode ? "team_lead" : "manager"}
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
                  variant={isTeamLeadMode ? "team_lead" : "manager"}
                  canOpenEmployees={hasEmployees}
                />
              </DashboardWidgetBoundary>
            </Suspense>
          </WorkflowPanel>
          <WorkflowPanel title="Manager action paths" subtitle="Fast routes into the surfaces that affect team delivery most">
            <QuickActionGrid actions={actionPaths} />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Operating scope" subtitle={`What this ${isTeamLeadMode ? "team lead" : "manager"} surface is optimized for`}>
          <p className="muted">
            {isTeamLeadMode
              ? "Team leads stay close to coverage, approvals, shift pressure, and the workstreams that can block frontline execution."
              : "Managers get direct coverage, approval pressure, team attendance visibility, and fast navigation into the workstreams that can block execution."}
          </p>
        </DashboardPanel>
      </DashboardSection>
    </div>
  );
};
