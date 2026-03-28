"use client";

import { useEffect, useMemo, useState } from "react";
import { MiniBarChart } from "@/components/shared/Charts";
import { DashboardPanel, QuickActionGrid, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import { SkeletonCard, SkeletonChart } from "@/components/ui/SkeletonBlocks";
import { loadManagerDashboardData } from "@/components/dashboard/widgets/dashboard-data-loaders";

type ManagerOperationsWidgetProps = {
  variant: "manager" | "team_lead";
  allowedRoutes?: string[];
  canViewTeamAttendance?: boolean;
};

export default function ManagerOperationsWidget({
  variant,
  allowedRoutes = [],
  canViewTeamAttendance = false,
}: ManagerOperationsWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadManagerDashboardData>>>(null);
  const allowedRouteSet = useMemo(() => new Set(allowedRoutes), [allowedRoutes]);

  useEffect(() => {
    let active = true;
    void loadManagerDashboardData()
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const heatmapValues = useMemo(() => (data?.teamAttendanceHeatmap ?? []).map((row) => row.present), [data]);

  if (loading) {
    return (
      <div className="grid-2">
        <SkeletonCard rows={6} />
        <SkeletonChart />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid-2">
        <DashboardPanel title="Quick actions" subtitle="Unable to load operations">
          <p className="muted">Manager operations are temporarily unavailable.</p>
        </DashboardPanel>
        <DashboardPanel title="Attendance momentum" subtitle="Unable to load trend" tone="soft">
          <p className="muted">Try again in a moment.</p>
        </DashboardPanel>
      </div>
    );
  }

  return (
    <div className="grid-2">
      <DashboardPanel title="Quick actions" subtitle="High-frequency operational flows">
        <QuickActionGrid
          actions={[
            ...(allowedRouteSet.has("/app/approvals") ? [{ label: "Review approvals", href: "/app/approvals", caption: "Leave + attendance" }] : []),
            ...(allowedRouteSet.has("/app/leave/review") ? [{ label: "Leave review", href: "/app/leave/review", caption: "Approve, reject, cancel" }] : []),
            ...(canViewTeamAttendance ? [{ label: "Team attendance", href: "/app/attendance/team", caption: "Today status" }] : []),
            ...(allowedRouteSet.has("/app/attendance/shift-swaps") ? [{ label: "Shift swaps", href: "/app/attendance/shift-swaps", caption: "Requests and review" }] : []),
            ...(variant === "team_lead" && allowedRouteSet.has("/app/chat") ? [{ label: "Team chat", href: "/app/chat", caption: "Coordination updates" }] : []),
            ...(allowedRouteSet.has("/app/projects") && variant === "manager" ? [{ label: "Projects", href: "/app/projects", caption: "Execution and staffing" }] : []),
            ...(allowedRouteSet.has("/app/employees") ? [{
              label: variant === "team_lead" ? "Employee profiles" : "Team search",
              href: "/app/employees",
              caption: "Directory"
            }] : [])
          ]}
        />
        <SignalRow label="Heatmap rows" value={data.teamAttendanceHeatmap.length} />
        <SignalRow label="Reliability index" value={`${data.teamReliabilityScore ?? 0}%`} tone="info" />
      </DashboardPanel>

      <DashboardPanel title="Attendance momentum" subtitle="Present count in recent days" tone="soft">
        {heatmapValues.length > 0 ? <MiniBarChart values={heatmapValues} height={88} /> : <p className="muted">No recent attendance data.</p>}
        {data.teamAttendanceHeatmap.slice(0, 3).map((row) => (
          <SignalRow key={row.date} label={row.date} value={`P ${row.present} | A ${row.absent} | L ${row.onLeave}`} />
        ))}
      </DashboardPanel>
    </div>
  );
}
