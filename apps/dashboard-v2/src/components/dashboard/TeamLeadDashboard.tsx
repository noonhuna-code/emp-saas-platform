"use client";

import Link from "next/link";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
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
import { fetchTeamAttendance } from "@/lib/client/api";
import type { TeamAttendanceRow } from "@/lib/types/attendance";

const ManagerOperationsWidget = lazy(() => import("@/components/dashboard/widgets/ManagerOperationsWidget"));
const ManagerWorkflowWidget = lazy(() => import("@/components/dashboard/widgets/ManagerWorkflowWidget"));

export const TeamLeadDashboard = () => {
  const [view, setView] = useState<DashboardView>("workspace");
  const [teamRows, setTeamRows] = useState<TeamAttendanceRow[]>([]);
  const [teamRowsLoading, setTeamRowsLoading] = useState(true);
  const [teamRowsError, setTeamRowsError] = useState<string | null>(null);
  const perf = useDashboardPerf("team_lead");

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
            <Link href="/app/attendance/review" className="secondary-btn">Attendance Review</Link>
            <Link href="/app/attendance/shifts" className="secondary-btn">Shifts & Breaks</Link>
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

        <DashboardPanel
          title="Live team coverage"
          subtitle="See employee profile, shift, breaks, and present-state context without leaving the dashboard."
          actions={<Link href="/app/attendance/team" className="secondary-btn">Open full team attendance</Link>}
        >
          {teamRowsLoading ? (
            <SkeletonList rows={6} />
          ) : teamRowsError ? (
            <p className="text-sm text-rose-600">{teamRowsError}</p>
          ) : previewRows.length === 0 ? (
            <p className="muted">No scoped employee rows are available right now.</p>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white/90">
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
                            <p className="font-medium text-slate-900">{row.employee_name ?? row.employee_id}</p>
                            <p className="text-xs text-slate-500">
                              {[row.employee_code, row.designation].filter(Boolean).join(" · ") || "No profile metadata"}
                            </p>
                            <p className="text-xs text-slate-400">{row.team_name ?? row.department_name ?? "No team"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{row.day_state.replace(/_/g, " ")}</div>
                          <div className="text-xs text-slate-500">{row.payroll_impact.replace(/_/g, " ")}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{row.shift_name ?? "-"}</div>
                          <div className="text-xs text-slate-500">
                            {row.shift_start_time && row.shift_end_time ? `${row.shift_start_time.slice(0, 5)}-${row.shift_end_time.slice(0, 5)}` : "No active shift window"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{row.break_summary ?? "No break assigned"}</td>
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
          )}
        </DashboardPanel>

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
                { label: "Attendance review", href: "/app/attendance/review", caption: "Late Login and corrections" },
                { label: "Shifts & breaks", href: "/app/attendance/shifts", caption: "Assign shift and break windows" },
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
