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

export const ManagerDashboard = () => {
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
          setError(result.error ?? "Unable to load manager dashboard");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load manager dashboard");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const heatmapValues = useMemo(() => {
    if (!data) return [] as number[];
    return data.teamAttendanceHeatmap.map((row) => row.present);
  }, [data]);

  const coverageTimeline = useMemo(() => {
    return (data?.teamAttendanceHeatmap ?? []).map((row) => ({
      title: row.date,
      subtitle: `Present ${row.present} | Absent ${row.absent} | Leave ${row.onLeave}`,
      meta: `${row.present + row.onLeave} covered`
    }));
  }, [data]);

  if (loading) return <LoadingState label="Loading manager dashboard..." />;
  if (error || !data) return <ErrorState message={error ?? "Manager dashboard unavailable"} />;

  return (
    <div className="dashboard-shell fade-in">
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

      <div className="dashboard-kpi-grid">
        <DashboardKpiTile label="Pending leave" value={data.pendingLeaveApprovals} hint="Awaiting manager decision" accent={data.pendingLeaveApprovals > 0 ? "warning" : "success"} />
        <DashboardKpiTile label="Pending overtime" value={data.pendingOvertimeApprovals} hint="Requires review" accent={data.pendingOvertimeApprovals > 0 ? "warning" : "success"} />
        <DashboardKpiTile
          label="Team reliability"
          value={`${data.teamReliabilityScore ?? 0}%`}
          hint="90-day service score"
          footer={<Donut value={data.teamReliabilityScore ?? 0} />}
        />
        <DashboardKpiTile label="Direct reports" value={data.quickSearch.length} hint="Current manager scope" accent="info" />
      </div>

      <div className="grid-2">
        <DashboardPanel title="Quick actions" subtitle="High-frequency manager flows">
          <QuickActionGrid
            actions={[
              { label: "Review approvals", href: "/app/approvals", caption: "Leave + attendance" },
              { label: "Team attendance", href: "/app/attendance/team", caption: "Today status" },
              { label: "Attendance review", href: "/app/attendance/review", caption: "Corrections" },
              { label: "Team search", href: "/app/employees", caption: "Directory" }
            ]}
          />
          <SignalRow label="Heatmap rows" value={data.teamAttendanceHeatmap.length} />
          <SignalRow label="Reliability index" value={`${data.teamReliabilityScore ?? 0}%`} tone="info" />
        </DashboardPanel>

        <DashboardPanel title="Attendance momentum" subtitle="Present count in the last 7 days" tone="soft">
          {heatmapValues.length > 0 ? <MiniBarChart values={heatmapValues} height={88} /> : <p className="muted">No recent attendance data.</p>}
          {data.teamAttendanceHeatmap.slice(0, 3).map((row) => (
            <SignalRow key={row.date} label={row.date} value={`P ${row.present} | A ${row.absent} | L ${row.onLeave}`} />
          ))}
        </DashboardPanel>
      </div>

      <div className="grid-2">
        <DashboardPanel title="Team attendance pulse" subtitle="Last 7 days coverage timeline" tone="spotlight">
          {coverageTimeline.length > 0 ? <TimelineList items={coverageTimeline} /> : <p className="muted">No attendance data.</p>}
        </DashboardPanel>

        <DashboardPanel title="Quick employee search" subtitle="Direct report shortcuts">
          {data.quickSearch.length === 0 ? <p className="muted">No direct reports assigned.</p> : null}
          {data.quickSearch.slice(0, 8).map((employee) => (
            <div key={employee.id} className="row" style={{ justifyContent: "space-between" }}>
              <div className="stack" style={{ gap: 4 }}>
                <strong>{employee.full_name}</strong>
                <span className="muted">{employee.designation ?? "Employee"}</span>
              </div>
              <Link className="secondary-btn" href={`/app/employees/${employee.id}`}>View</Link>
            </div>
          ))}
        </DashboardPanel>
      </div>
    </div>
  );
};
