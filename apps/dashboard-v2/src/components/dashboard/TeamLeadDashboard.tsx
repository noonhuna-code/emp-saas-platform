"use client";

import Link from "next/link";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
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
import { Tabs } from "@/components/shared/Tabs";
import { SkeletonCard, SkeletonChart, SkeletonList } from "@/components/ui/SkeletonBlocks";
import ManagerKpiWidget from "@/components/dashboard/widgets/ManagerKpiWidget";
import { fetchTeamAttendance } from "@/lib/client/api";
import type { TeamAttendanceRow } from "@/lib/types/attendance";

const ManagerOperationsWidget = lazy(() => import("@/components/dashboard/widgets/ManagerOperationsWidget"));
const ManagerWorkflowWidget = lazy(() => import("@/components/dashboard/widgets/ManagerWorkflowWidget"));
const TEAM_LEAD_OPERATIONS_TABS = [
  { id: "leave", label: "Leave approvals" },
  { id: "late-login", label: "Late Login" },
  { id: "profiles", label: "Employee profiles" },
  { id: "shifts", label: "Assign shifts" },
  { id: "breaks", label: "Assign breaks" },
  { id: "shift-changes", label: "Shift changes" },
];

export const TeamLeadDashboard = ({
  allowedRoutes = [],
  canViewTeamAttendance = false,
  canReviewLeave = false,
}: {
  allowedRoutes?: string[];
  canViewTeamAttendance?: boolean;
  canReviewLeave?: boolean;
}) => {
  const [view, setView] = useState<DashboardView>("workspace");
  const [teamRows, setTeamRows] = useState<TeamAttendanceRow[]>([]);
  const [teamRowsLoading, setTeamRowsLoading] = useState(true);
  const [teamRowsError, setTeamRowsError] = useState<string | null>(null);
  const [operationsTab, setOperationsTab] = useState("leave");
  const perf = useDashboardPerf("team_lead");
  const allowedRouteSet = useMemo(() => new Set(allowedRoutes), [allowedRoutes]);
  const peopleHref = allowedRouteSet.has("/app/people")
    ? "/app/people"
    : allowedRouteSet.has("/app/employees")
      ? "/app/employees"
      : null;
  const heroActions = [
    canViewTeamAttendance && allowedRouteSet.has("/app/attendance/team")
      ? { href: "/app/attendance/team", label: "Team Attendance", tone: "primary" as const }
      : null,
    allowedRouteSet.has("/app/attendance/review")
      ? { href: "/app/attendance/review", label: "Attendance Review", tone: "secondary" as const }
      : null,
    allowedRouteSet.has("/app/attendance/shifts")
      ? { href: "/app/attendance/shifts", label: "Shifts & Breaks", tone: "secondary" as const }
      : null,
    canReviewLeave && allowedRouteSet.has("/app/leave/review")
      ? { href: "/app/leave/review", label: "Leave Review", tone: "secondary" as const }
      : null,
    peopleHref
      ? { href: peopleHref, label: "People Directory", tone: "secondary" as const }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string; tone: "primary" | "secondary" }>;
  const heroSignals = [
    { label: "Coverage", value: canViewTeamAttendance ? "Frontline live" : "Scoped routes" },
    { label: "Shift control", value: allowedRouteSet.has("/app/attendance/shifts") ? "Assignments on" : "Read only" },
    { label: "People", value: teamRowsLoading ? "Loading" : `${teamRows.length} scoped` }
  ];

  useEffect(() => {
    perf.markKpiRendered();
  }, [perf]);

  useEffect(() => {
    let cancelled = false;

    const loadTeamRows = async () => {
      setTeamRowsLoading(true);
      setTeamRowsError(null);
      try {
        const result = await fetchTeamAttendance();
        if (cancelled) return;
        if (!result.ok || !result.data) {
          setTeamRows([]);
          setTeamRowsError(result.error ?? "Unable to load team workforce status");
          return;
        }
        setTeamRows(result.data.rows ?? []);
      } catch (error) {
        if (!cancelled) {
          setTeamRows([]);
          setTeamRowsError(error instanceof Error ? error.message : "Unable to load team workforce status");
        }
      } finally {
        if (!cancelled) setTeamRowsLoading(false);
      }
    };

    void loadTeamRows();
    return () => {
      cancelled = true;
    };
  }, []);

  const previewRows = useMemo(() => teamRows.slice(0, 8), [teamRows]);
  const leaveActions = [
    canReviewLeave && allowedRouteSet.has("/app/leave/review")
      ? { label: "Leave approvals", href: "/app/leave/review", caption: "Approve, reject, or cancel requests" }
      : null,
    allowedRouteSet.has("/app/approvals")
      ? { label: "Approvals queue", href: "/app/approvals", caption: "Cross-module pending blockers" }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;
  const lateLoginActions = [
    allowedRouteSet.has("/app/attendance/review")
      ? { label: "Attendance review", href: "/app/attendance/review", caption: "Late Login and attendance corrections" }
      : null,
    canViewTeamAttendance && allowedRouteSet.has("/app/attendance/team")
      ? { label: "Team attendance", href: "/app/attendance/team", caption: "Live late and presence context" }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;
  const profileActions = [
    peopleHref
      ? { label: "Employee profiles", href: peopleHref, caption: "Open direct-report records and profile context" }
      : null,
    allowedRouteSet.has("/app/chat")
      ? { label: "Team chat", href: "/app/chat", caption: "Coordinate directly with your team" }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;
  const shiftActions = [
    allowedRouteSet.has("/app/attendance/shifts")
      ? { label: "Assign shifts", href: "/app/attendance/shifts", caption: "Set or edit shift windows" }
      : null,
    allowedRouteSet.has("/app/attendance/shift-swaps")
      ? { label: "Shift swaps", href: "/app/attendance/shift-swaps", caption: "Review swap requests and outcomes" }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;
  const breakActions = [
    allowedRouteSet.has("/app/attendance/shifts")
      ? { label: "Assign breaks", href: "/app/attendance/shifts", caption: "Set or edit break windows" }
      : null,
    canViewTeamAttendance && allowedRouteSet.has("/app/attendance/team")
      ? { label: "Team attendance", href: "/app/attendance/team", caption: "Check live break and presence context" }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;
  const shiftChangeActions = [
    allowedRouteSet.has("/app/attendance/shift-swaps")
      ? { label: "Shift changes", href: "/app/attendance/shift-swaps", caption: "Review swap and shift change requests" }
      : null,
    allowedRouteSet.has("/app/attendance/shifts")
      ? { label: "Update schedules", href: "/app/attendance/shifts", caption: "Adjust assigned shifts and coverage" }
      : null,
    canViewTeamAttendance && allowedRouteSet.has("/app/attendance/team")
      ? { label: "Coverage view", href: "/app/attendance/team", caption: "Confirm downstream staffing impact" }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;
  const workspaceModules = [
    canViewTeamAttendance && allowedRouteSet.has("/app/attendance/team")
      ? {
          title: "Frontline team coverage",
          description: "Watch direct-report attendance, break posture, and current staffing state from one live desk.",
          href: "/app/attendance/team",
          label: "Coverage",
          metric: teamRowsLoading ? "Loading" : `${teamRows.length} scoped`,
          highlights: ["Attendance", "Breaks", "Shift state"]
        }
      : null,
    (canReviewLeave && allowedRouteSet.has("/app/leave/review")) || allowedRouteSet.has("/app/approvals")
      ? {
          title: "Approvals and exceptions",
          description: "Resolve leave, late-login, and team workflow issues before they turn into coverage gaps.",
          href: canReviewLeave && allowedRouteSet.has("/app/leave/review") ? "/app/leave/review" : "/app/approvals",
          label: "Workflow",
          metric: canReviewLeave ? "Review on" : "Queue",
          highlights: ["Leave", "Late login", "Escalations"]
        }
      : null,
    (allowedRouteSet.has("/app/attendance/shifts") || peopleHref)
      ? {
          title: "People and shift assignments",
          description: "Keep direct-report context, shift assignment, and change handling close to the team lead surface.",
          href: allowedRouteSet.has("/app/attendance/shifts") ? "/app/attendance/shifts" : peopleHref!,
          label: "Assignments",
          metric: `${[Boolean(peopleHref), allowedRouteSet.has("/app/attendance/shifts"), allowedRouteSet.has("/app/attendance/shift-swaps")].filter(Boolean).length} lanes`,
          highlights: [peopleHref ? "Profiles" : "Team context", allowedRouteSet.has("/app/attendance/shifts") ? "Shifts" : "Coverage", allowedRouteSet.has("/app/attendance/shift-swaps") ? "Shift changes" : "Coordination"]
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; description: string; href: string; label?: string; metric?: string; highlights?: string[] }>;

  return (
    <DashboardScaffold
        eyebrow="Team Lead Workspace"
        title="Daily team coordination"
        subtitle="Keep frontline coverage, approvals, and direct-report context in one action-ready team lead desk."
        emphasis="operations"
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
        modeSubtitle="Switch between frontline coverage, team-level trends, and the operating queues you resolve most often."
      >

      <DashboardSection visible={view === "workspace"}>
        <section className="space-y-4">
          <ManagerKpiWidget variant="team_lead" />
        </section>

        {workspaceModules.length > 0 ? (
          <DashboardPanel title="Workspace modules" subtitle="TailAdmin-style team lead modules for frontline coverage, approvals, and assignments.">
            <DashboardModuleDeck modules={workspaceModules} />
          </DashboardPanel>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.72fr)]">
          <DashboardPanel
            title="Live team coverage"
            subtitle="See employee profile, shift, break, and present-state context without leaving the dashboard."
            actions={<Link href="/app/attendance/team" className="secondary-btn">Open full team attendance</Link>}
          >
            {teamRowsLoading ? (
              <SkeletonList rows={6} />
            ) : teamRowsError ? (
              <p className="text-sm text-rose-600">{teamRowsError}</p>
            ) : previewRows.length === 0 ? (
              <p className="muted">No scoped employee rows are available right now.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 lg:hidden">
                  {previewRows.map((row) => (
                    <div key={`${row.employee_id}:${row.attendance_date}:card`} className="rounded-[20px] border border-slate-200/80 bg-white/92 p-4 shadow-sm">
                      <div className="space-y-1">
                        <p className="truncate font-semibold text-slate-950">{row.employee_name ?? row.employee_id}</p>
                        <p className="truncate text-xs text-slate-500">
                          {[row.employee_code, row.designation].filter(Boolean).join(" / ") || "No profile metadata"}
                        </p>
                        <p className="truncate text-xs text-slate-400">{row.team_name ?? row.department_name ?? "No team"}</p>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-slate-500">State</span>
                          <div className="min-w-0 text-right">
                            <div className="font-medium text-slate-900">{row.day_state.replace(/_/g, " ")}</div>
                            <div className="truncate text-xs text-slate-500">{row.payroll_impact.replace(/_/g, " ")}</div>
                          </div>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-slate-500">Shift</span>
                          <div className="min-w-0 text-right">
                            <div className="truncate">{row.shift_name ?? "-"}</div>
                            <div className="truncate text-xs text-slate-500">
                              {row.shift_start_time && row.shift_end_time ? `${row.shift_start_time.slice(0, 5)}-${row.shift_end_time.slice(0, 5)}` : "No active shift window"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-slate-500">Break</span>
                          <span className="line-clamp-2 text-right text-xs text-slate-600">{row.break_summary ?? "No break assigned"}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-slate-500">Clock</span>
                          <div className="text-right">
                            <div>{row.check_in ? new Date(row.check_in).toLocaleTimeString() : "-"}</div>
                            <div className="text-xs text-slate-500">{row.check_out ? `Out ${new Date(row.check_out).toLocaleTimeString()}` : "Still active"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-hidden rounded-[22px] border border-slate-200 bg-white/90 lg:block">
                  <div className="max-h-[360px] overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">State</th>
                          <th className="px-4 py-3">Shift</th>
                          <th className="px-4 py-3">Breaks</th>
                          <th className="px-4 py-3">Clock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                        {previewRows.map((row) => (
                          <tr key={`${row.employee_id}:${row.attendance_date}`}>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <p className="truncate font-medium text-slate-900">{row.employee_name ?? row.employee_id}</p>
                                <p className="truncate text-xs text-slate-500">
                                  {[row.employee_code, row.designation].filter(Boolean).join(" / ") || "No profile metadata"}
                                </p>
                                <p className="truncate text-xs text-slate-400">{row.team_name ?? row.department_name ?? "No team"}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{row.day_state.replace(/_/g, " ")}</div>
                              <div className="truncate text-xs text-slate-500">{row.payroll_impact.replace(/_/g, " ")}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="truncate">{row.shift_name ?? "-"}</div>
                              <div className="truncate text-xs text-slate-500">
                                {row.shift_start_time && row.shift_end_time ? `${row.shift_start_time.slice(0, 5)}-${row.shift_end_time.slice(0, 5)}` : "No active shift window"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              <span className="line-clamp-2">{row.break_summary ?? "No break assigned"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div>{row.check_in ? new Date(row.check_in).toLocaleTimeString() : "-"}</div>
                              <div className="text-xs text-slate-500">{row.check_out ? `Out ${new Date(row.check_out).toLocaleTimeString()}` : "Still active"}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </DashboardPanel>

          <WorkflowPanel title="Team lead action lanes" subtitle="Jump straight into the queue or workspace that needs your attention next.">
            <div className="space-y-4">
              <Tabs tabs={TEAM_LEAD_OPERATIONS_TABS} active={operationsTab} onChange={setOperationsTab} variant="soft" />
              {operationsTab === "leave" ? (
                leaveActions.length > 0 ? <QuickActionGrid actions={leaveActions} /> : <p className="muted">Leave approval tools are not available in this scope.</p>
              ) : null}
              {operationsTab === "late-login" ? (
                lateLoginActions.length > 0 ? <QuickActionGrid actions={lateLoginActions} /> : <p className="muted">Attendance review tools are not available in this scope.</p>
              ) : null}
              {operationsTab === "profiles" ? (
                profileActions.length > 0 ? <QuickActionGrid actions={profileActions} /> : <p className="muted">Profile and communication tools are not available in this scope.</p>
              ) : null}
              {operationsTab === "shifts" ? (
                shiftActions.length > 0 ? <QuickActionGrid actions={shiftActions} /> : <p className="muted">Shift tools are not available in this scope.</p>
              ) : null}
              {operationsTab === "breaks" ? (
                breakActions.length > 0 ? <QuickActionGrid actions={breakActions} /> : <p className="muted">Break tools are not available in this scope.</p>
              ) : null}
              {operationsTab === "shift-changes" ? (
                shiftChangeActions.length > 0 ? <QuickActionGrid actions={shiftChangeActions} /> : <p className="muted">Shift change tools are not available in this scope.</p>
              ) : null}
            </div>
          </WorkflowPanel>
        </div>

        <section className="space-y-4">
          <Suspense fallback={<div className="grid-2"><SkeletonCard rows={6} /><SkeletonChart /></div>}>
            <DashboardWidgetBoundary title="Team lead operations" message="Team operations are temporarily unavailable.">
              <ManagerOperationsWidget
                variant="team_lead"
                allowedRoutes={allowedRoutes}
                canViewTeamAttendance={canViewTeamAttendance}
              />
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
                <ManagerOperationsWidget
                  variant="team_lead"
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
          <WorkflowPanel title="Team workflow" subtitle="Review queue and pending actions">
            <Suspense fallback={<div className="grid-2"><SkeletonList rows={6} /><SkeletonList rows={6} /></div>}>
              <DashboardWidgetBoundary title="Team workflow" message="Workflow data is temporarily unavailable.">
                <ManagerWorkflowWidget
                  variant="team_lead"
                  peopleHref={peopleHref}
                />
              </DashboardWidgetBoundary>
            </Suspense>
          </WorkflowPanel>
          <WorkflowPanel title="Action lane status" subtitle="What this desk is built to resolve first">
            <div className="space-y-3">
              <p className="muted">
                Team leads stay anchored to today&apos;s coverage, leave approvals, late attendance, employee context, and shift changes without bouncing across mixed portals.
              </p>
              <QuickActionGrid actions={heroActions.map((action) => ({ label: action.label, href: action.href, caption: "Open workspace" }))} />
            </div>
          </WorkflowPanel>
        </div>

      <DashboardPanel title="Operating scope" subtitle="What this desk is built to resolve quickly">
          <p className="muted">
            Team leads stay focused on today&apos;s coverage, swap requests, attendance corrections, and the direct-report context needed to keep frontline work moving.
          </p>
        </DashboardPanel>
      </DashboardSection>
    </DashboardScaffold>
  );
};
