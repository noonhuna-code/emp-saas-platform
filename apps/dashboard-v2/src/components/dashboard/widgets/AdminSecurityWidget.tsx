"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardPanel, SignalRow, TimelineList } from "@/components/dashboard/DashboardPrimitives";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonCard, SkeletonList } from "@/components/ui/SkeletonBlocks";
import { loadAdminDashboardData } from "@/components/dashboard/widgets/dashboard-data-loaders";

const currency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);

export default function AdminSecurityWidget({
  allowedRoutes = [],
}: {
  allowedRoutes?: string[];
}) {
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<Awaited<ReturnType<typeof loadAdminDashboardData>>>(null);
  const allowedRouteSet = new Set(allowedRoutes);

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

  const alertTimeline = useMemo(() => {
    return (adminData?.securityAlerts ?? []).slice(0, 8).map((alert) => ({
      title: alert.lock_reason,
      subtitle: "Security lock event",
      meta: alert.created_at
    }));
  }, [adminData]);

  if (loading) {
    return (
      <div className="grid-2">
        <SkeletonCard rows={5} />
        <SkeletonList rows={6} />
      </div>
    );
  }

  return (
    <div className="grid-2">
      <DashboardPanel title="Payroll snapshot" subtitle="Most recent payroll run totals and status" tone="spotlight">
        {adminData?.payrollSnapshot ? (
          <>
            <SignalRow label="Run ID" value={adminData.payrollSnapshot.runId} />
            <SignalRow label="Status" value={<StatusBadge status={adminData.payrollSnapshot.status} />} />
            <SignalRow label="Total net" value={currency(adminData.payrollSnapshot.totalNet)} tone="info" />
            {allowedRouteSet.has("/app/payroll") ? <div className="row" style={{ justifyContent: "flex-end" }}>
              <Link href="/app/payroll" className="secondary-btn">Open payroll workspace</Link>
            </div> : null}
          </>
        ) : (
          <p className="muted">No payroll run available.</p>
        )}
      </DashboardPanel>

      <DashboardPanel title="Recent security alerts" subtitle="Tenant-scoped account lock events">
        {alertTimeline.length > 0 ? <TimelineList items={alertTimeline} /> : <p className="muted">No alerts in the last 30 days.</p>}
      </DashboardPanel>
    </div>
  );
}
