"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchManagerDashboard } from "@/lib/client/api";
import type { ManagerDashboardResponse } from "@/lib/types/dashboard";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { Donut, MiniBarChart } from "@/components/shared/Charts";
import {
  DashboardHero,
  DashboardKpiTile,
  DashboardPanel,
  QuickActionGrid,
  SignalRow,
  TimelineList
} from "@/components/dashboard/DashboardPrimitives";

export const TeamLeadDashboard = () => {
  const [data, setData] = useState<ManagerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchManagerDashboard()
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load Team Lead dashboard");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load Team Lead dashboard");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const attendanceTrend = useMemo(() => data?.teamAttendanceHeatmap.map((d) => d.present + d.onLeave) ?? [], [data]);

  const pulseTimeline = useMemo(() => {
    return (data?.teamAttendanceHeatmap ?? []).map((row) => ({
      title: row.date,
      subtitle: `Present ${row.present} | Absent ${row.absent} | Leave ${row.onLeave}`,
      meta: `${row.present + row.onLeave} covered`
    }));
  }, [data]);

  if (loading) return <LoadingState label="Loading Team Lead dashboard..." />;
  if (error || !data) return <ErrorState message={error ?? "Team Lead dashboard unavailable"} />;

  return (
    <div className="dashboard-shell fade-in">
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

      <div className="dashboard-kpi-grid">
        <DashboardKpiTile label="Pending leave" value={data.pendingLeaveApprovals} accent={data.pendingLeaveApprovals > 0 ? "warning" : "success"} />
        <DashboardKpiTile label="Pending overtime" value={data.pendingOvertimeApprovals} accent={data.pendingOvertimeApprovals > 0 ? "warning" : "success"} />
        <DashboardKpiTile label="Team reliability" value={`${data.teamReliabilityScore ?? 0}%`} footer={<Donut value={data.teamReliabilityScore ?? 0} />} />
        <DashboardKpiTile label="Team members" value={data.quickSearch.length} hint="Current lead scope" accent="info" />
      </div>

      <div className="grid-2">
        <DashboardPanel title="Quick actions" subtitle="Daily operational shortcuts">
          <QuickActionGrid
            actions={[
              { label: "Team attendance", href: "/app/attendance/team", caption: "Today status" },
              { label: "Review corrections", href: "/app/attendance/review", caption: "Attendance review" },
              { label: "Approvals queue", href: "/app/approvals", caption: "Leave and corrections" },
              { label: "Employee profiles", href: "/app/employees", caption: "Direct reports" }
            ]}
          />
        </DashboardPanel>

        <DashboardPanel title="Attendance momentum" subtitle="Coverage trend over recent days" tone="soft">
          {attendanceTrend.length > 0 ? <MiniBarChart values={attendanceTrend} height={88} /> : <p className="muted">No recent attendance.</p>}
          {data.teamAttendanceHeatmap.slice(0, 3).map((row) => (
            <SignalRow key={row.date} label={row.date} value={`P ${row.present} | A ${row.absent} | L ${row.onLeave}`} />
          ))}
        </DashboardPanel>
      </div>

      <div className="grid-2">
        <DashboardPanel title="Team attendance pulse" subtitle="Daily coverage summary" tone="spotlight">
          {pulseTimeline.length > 0 ? <TimelineList items={pulseTimeline} /> : <p className="muted">No attendance data for current scope.</p>}
        </DashboardPanel>

        <DashboardPanel title="Direct report access" subtitle="Open employee records quickly">
          {data.quickSearch.length === 0 ? <p className="muted">No direct report scope available.</p> : null}
          {data.quickSearch.slice(0, 8).map((employee) => (
            <div key={employee.id} className="row" style={{ justifyContent: "space-between" }}>
              <div className="stack" style={{ gap: 4 }}>
                <strong>{employee.full_name}</strong>
                <span className="muted">{employee.designation ?? "Employee"}</span>
              </div>
              <Link href={`/app/employees/${employee.id}`} className="secondary-btn">Open</Link>
            </div>
          ))}
        </DashboardPanel>
      </div>
    </div>
  );
};
