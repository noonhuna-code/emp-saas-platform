"use client";

import { useEffect, useMemo, useState } from "react";
import { Donut } from "@/components/shared/Charts";
import { DashboardKpiTile } from "@/components/dashboard/DashboardPrimitives";
import { SkeletonCard } from "@/components/ui/SkeletonBlocks";
import { getLimitInteger } from "@/lib/client/entitlements";
import {
  loadAdminDashboardData,
  loadBillingOverviewData
} from "@/components/dashboard/widgets/dashboard-data-loaders";

const currency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);

export default function AdminKpiWidget() {
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<Awaited<ReturnType<typeof loadAdminDashboardData>>>(null);
  const [billingData, setBillingData] = useState<Awaited<ReturnType<typeof loadBillingOverviewData>>>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([loadAdminDashboardData(), loadBillingOverviewData()])
      .then(([admin, billing]) => {
        if (!active) return;
        setAdminData(admin);
        setBillingData(billing);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const seatLimit = useMemo(
    () => getLimitInteger(billingData?.entitlements, "limit.active_seats"),
    [billingData]
  );

  if (loading) {
    return (
      <div className="dashboard-kpi-grid">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
      </div>
    );
  }

  if (!adminData) {
    return (
      <div className="dashboard-kpi-grid">
        <DashboardKpiTile label="Status" value="Unavailable" hint="Admin KPI data unavailable" accent="warning" />
      </div>
    );
  }

  return (
    <div className="dashboard-kpi-grid">
      <DashboardKpiTile label="Total headcount" value={adminData.headcount.total} hint={`Active ${adminData.headcount.active}`} accent="info" />
      <DashboardKpiTile
        label="Plan"
        value={billingData?.subscription ? billingData.subscription.planName : "Unavailable"}
        hint={billingData?.subscription ? billingData.subscription.status : "Billing scope unavailable"}
        accent={billingData?.subscription?.status === "past_due" ? "warning" : "success"}
      />
      <DashboardKpiTile label="Attendance rate" value={`${adminData.attendanceRate ?? 0}%`} footer={<Donut value={adminData.attendanceRate ?? 0} />} />
      <DashboardKpiTile
        label="Billable seats"
        value={billingData ? `${billingData.seatSummary.activeBillable}${seatLimit ? ` / ${seatLimit}` : ""}` : "-"}
        hint={billingData ? `Active total ${billingData.seatSummary.activeTotal}` : "Billing scope unavailable"}
        accent="info"
      />
      <DashboardKpiTile
        label="Payroll snapshot"
        value={adminData.payrollSnapshot ? currency(adminData.payrollSnapshot.totalNet) : "-"}
        hint={adminData.payrollSnapshot ? `Status ${adminData.payrollSnapshot.status}` : "No payroll run available"}
        accent={adminData.payrollSnapshot?.status === "processing" ? "warning" : "success"}
      />
    </div>
  );
}
