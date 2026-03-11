"use client";

import { useEffect, useState } from "react";
import { Donut } from "@/components/shared/Charts";
import { DashboardKpiTile } from "@/components/dashboard/DashboardPrimitives";
import { SkeletonCard } from "@/components/ui/SkeletonBlocks";
import { loadManagerDashboardData } from "@/components/dashboard/widgets/dashboard-data-loaders";

type ManagerKpiWidgetProps = {
  variant: "manager" | "team_lead";
};

export default function ManagerKpiWidget({ variant }: ManagerKpiWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadManagerDashboardData>>>(null);

  useEffect(() => {
    let active = true;
    void loadManagerDashboardData()
      .then((result) => {
        if (!active) return;
        setData(result);
        setHasError(!result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="dashboard-kpi-grid">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
      </div>
    );
  }

  if (hasError || !data) {
    return (
      <div className="dashboard-kpi-grid">
        <DashboardKpiTile label="Status" value="Unavailable" hint="Unable to load KPI summary" accent="warning" />
      </div>
    );
  }

  return (
    <div className="dashboard-kpi-grid">
      <DashboardKpiTile
        label="Pending leave"
        value={data.pendingLeaveApprovals}
        hint={variant === "team_lead" ? "Awaiting lead decision" : "Awaiting manager decision"}
        accent={data.pendingLeaveApprovals > 0 ? "warning" : "success"}
      />
      <DashboardKpiTile
        label="Pending overtime"
        value={data.pendingOvertimeApprovals}
        hint="Requires review"
        accent={data.pendingOvertimeApprovals > 0 ? "warning" : "success"}
      />
      <DashboardKpiTile
        label="Team reliability"
        value={`${data.teamReliabilityScore ?? 0}%`}
        hint="90-day service score"
        footer={<Donut value={data.teamReliabilityScore ?? 0} />}
      />
      <DashboardKpiTile
        label={variant === "team_lead" ? "Team members" : "Direct reports"}
        value={data.quickSearch.length}
        hint="Current scope"
        accent="info"
      />
    </div>
  );
}
