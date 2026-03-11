"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardPanel, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import { MiniBarChart } from "@/components/shared/Charts";
import { SkeletonCard, SkeletonChart } from "@/components/ui/SkeletonBlocks";
import { loadAdminDashboardData } from "@/components/dashboard/widgets/dashboard-data-loaders";

export default function AdminDepartmentWidget() {
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<Awaited<ReturnType<typeof loadAdminDashboardData>>>(null);

  useEffect(() => {
    let active = true;

    void loadAdminDashboardData()
      .then((data) => {
        if (!active) return;
        setAdminData(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const deptValues = useMemo(() => {
    return (adminData?.departmentBreakdown ?? []).map((row) => row.count);
  }, [adminData]);

  if (loading) {
    return (
      <div className="grid-2">
        <SkeletonChart />
        <SkeletonCard rows={6} />
      </div>
    );
  }

  return (
    <div className="grid-2">
      <DashboardPanel title="Department distribution" subtitle="Employee count by department">
        {(adminData?.departmentBreakdown.length ?? 0) === 0 ? <p className="muted">No departments configured.</p> : null}
        {(adminData?.departmentBreakdown ?? []).map((dept) => (
          <SignalRow key={dept.department} label={dept.department} value={dept.count} />
        ))}
        {deptValues.length > 0 ? <MiniBarChart values={deptValues} height={88} /> : null}
      </DashboardPanel>

      <DashboardPanel title="Operations summary" subtitle="Read-only governance indicators">
        <SignalRow label="Headcount total" value={adminData?.headcount.total ?? "-"} />
        <SignalRow label="Headcount active" value={adminData?.headcount.active ?? "-"} />
        <SignalRow label="Attendance rate" value={`${adminData?.attendanceRate ?? 0}%`} tone="info" />
        <SignalRow label="Leave utilization" value={`${adminData?.leaveUtilization ?? 0}%`} tone="warning" />
        <SignalRow
          label="Alerts (30d)"
          value={adminData?.securityAlerts.length ?? 0}
          tone={(adminData?.securityAlerts.length ?? 0) > 0 ? "warning" : "success"}
        />
      </DashboardPanel>
    </div>
  );
}
