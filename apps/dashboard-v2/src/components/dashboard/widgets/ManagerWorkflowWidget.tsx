"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardPanel, TimelineList } from "@/components/dashboard/DashboardPrimitives";
import { SkeletonList } from "@/components/ui/SkeletonBlocks";
import { loadManagerDashboardData } from "@/components/dashboard/widgets/dashboard-data-loaders";

type ManagerWorkflowWidgetProps = {
  variant: "manager" | "team_lead";
};

export default function ManagerWorkflowWidget({ variant }: ManagerWorkflowWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadManagerDashboardData>>>(null);

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

  const timeline = useMemo(() => {
    return (data?.teamAttendanceHeatmap ?? []).map((row) => ({
      title: row.date,
      subtitle: `Present ${row.present} | Absent ${row.absent} | Leave ${row.onLeave}`,
      meta: `${row.present + row.onLeave} covered`
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="grid-2">
        <SkeletonList rows={6} />
        <SkeletonList rows={6} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid-2">
        <DashboardPanel title="Attendance pulse" subtitle="Unavailable" tone="spotlight">
          <p className="muted">Unable to load coverage timeline.</p>
        </DashboardPanel>
        <DashboardPanel title="Directory access" subtitle="Unavailable">
          <p className="muted">Unable to load direct reports.</p>
        </DashboardPanel>
      </div>
    );
  }

  return (
    <div className="grid-2">
      <DashboardPanel
        title={variant === "team_lead" ? "Team attendance pulse" : "Team attendance pulse"}
        subtitle="Last 7 days coverage timeline"
        tone="spotlight"
      >
        {timeline.length > 0 ? <TimelineList items={timeline} /> : <p className="muted">No attendance data.</p>}
      </DashboardPanel>

      <DashboardPanel
        title={variant === "team_lead" ? "Direct report access" : "Quick employee search"}
        subtitle="Open employee records quickly"
      >
        {data.quickSearch.length === 0 ? <p className="muted">No direct reports assigned.</p> : null}
        {data.quickSearch.slice(0, 8).map((employee) => (
          <div key={employee.id} className="row" style={{ justifyContent: "space-between" }}>
            <div className="stack" style={{ gap: 4 }}>
              <strong>{employee.full_name}</strong>
              <span className="muted">{employee.designation ?? "Employee"}</span>
            </div>
            <Link className="secondary-btn" href={`/app/employees/${employee.id}`}>
              {variant === "team_lead" ? "Open" : "View"}
            </Link>
          </div>
        ))}
      </DashboardPanel>
    </div>
  );
}
