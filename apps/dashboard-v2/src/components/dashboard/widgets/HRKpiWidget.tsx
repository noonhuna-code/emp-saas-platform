"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardKpiTile } from "@/components/dashboard/DashboardPrimitives";
import { SkeletonCard } from "@/components/ui/SkeletonBlocks";
import { getLimitInteger } from "@/lib/client/entitlements";
import {
  loadBillingOverviewData,
  loadPayrollRunsData,
  loadPayslipHistoryData
} from "@/components/dashboard/widgets/dashboard-data-loaders";

const currency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);

export default function HRKpiWidget() {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<Awaited<ReturnType<typeof loadBillingOverviewData>>>(null);
  const [runsData, setRunsData] = useState<Awaited<ReturnType<typeof loadPayrollRunsData>>>(null);
  const [payslipData, setPayslipData] = useState<Awaited<ReturnType<typeof loadPayslipHistoryData>>>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([loadPayrollRunsData(), loadPayslipHistoryData(), loadBillingOverviewData()])
      .then(([runs, payslips, billing]) => {
        if (!active) return;
        setRunsData(runs);
        setPayslipData(payslips);
        setBillingData(billing);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const rows = payslipData?.rows ?? [];
    return {
      totalNet: rows.reduce((acc, row) => acc + row.netSalary, 0),
      lockedCount: rows.filter((row) => row.isLocked).length,
      paidCount: rows.filter((row) => row.status.toLowerCase() === "paid").length,
      count: rows.length
    };
  }, [payslipData]);

  const payrollRunsLimit = getLimitInteger(billingData?.entitlements, "limit.payroll_runs_per_month_max");
  const payslipEmailsLimit = getLimitInteger(billingData?.entitlements, "limit.payslip_emails_per_month_max");

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

  return (
    <div className="dashboard-kpi-grid">
      <DashboardKpiTile
        label="Plan"
        value={billingData?.subscription ? billingData.subscription.planName : "Unavailable"}
        hint={billingData?.subscription ? billingData.subscription.status : "Billing scope unavailable"}
        accent={billingData?.subscription?.status === "past_due" ? "warning" : "success"}
      />
      <DashboardKpiTile label="Payroll runs" value={runsData?.rows.length ?? 0} hint="Recent timeline sample" accent="info" />
      <DashboardKpiTile label="Payslip rows" value={totals.count} hint={`Scope: ${payslipData?.viewerScope ?? "-"}`} accent="info" />
      <DashboardKpiTile label="Locked payslips" value={totals.lockedCount} hint={`Paid snapshots ${totals.paidCount}`} accent={totals.lockedCount > 0 ? "success" : "default"} />
      <DashboardKpiTile
        label="Page net total"
        value={currency(totals.totalNet)}
        hint={`Run limit ${payrollRunsLimit ?? "-"} | Email limit ${payslipEmailsLimit ?? "-"}`}
        accent="success"
      />
    </div>
  );
}
