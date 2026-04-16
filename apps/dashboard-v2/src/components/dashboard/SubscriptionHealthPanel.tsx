"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { BillingOverview } from "@/lib/types/billing";
import { DashboardPanel, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getLimitInteger } from "@/lib/client/entitlements";

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const renderProgress = (label: string, used: number, limit: number | null): ReactNode => {
  if (limit === null || limit <= 0) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
          <strong className="text-sm font-semibold text-slate-950 dark:text-slate-50">{used}</strong>
        </div>
      </div>
    );
  }

  const percent = clampPercent((used / limit) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
        <strong className="text-sm font-semibold text-slate-950 dark:text-slate-50">{used} / {limit}</strong>
      </div>
      <div
        className="relative h-3 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
        aria-label={`${label} usage`}
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(135deg,#1e62ff,#22c55e)] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-end">
        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          {percent}% used
        </span>
      </div>
    </div>
  );
};

export const SubscriptionHealthPanel = ({
  billing,
  payrollRunsUsed,
  payslipRowsUsed,
  title = "Subscription health",
  subtitle = "Plan status, renewal timeline, and entitlement usage"
}: {
  billing: BillingOverview | null;
  payrollRunsUsed?: number;
  payslipRowsUsed?: number;
  title?: string;
  subtitle?: string;
}) => {
  if (!billing?.subscription) {
    return (
      <DashboardPanel title={title} subtitle={subtitle} tone="soft">
        <p className="muted">
          Billing context is unavailable for this tenant. Bootstrap trial or subscription to resolve entitlements.
        </p>
        <div className="row">
          <Link href="/app/billing" className="secondary-btn">Open Billing</Link>
        </div>
      </DashboardPanel>
    );
  }

  const status = billing.subscription.status;
  const renewalDate = new Date(billing.subscription.currentPeriodEnd);
  const renewalDays =
    Number.isFinite(renewalDate.getTime())
      ? Math.ceil((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
  const seatLimit = billing.seatSummary.seatLimit;
  const payrollRunLimit = getLimitInteger(billing.entitlements, "limit.payroll_runs_per_month_max");
  const payslipEmailLimit = getLimitInteger(billing.entitlements, "limit.payslip_emails_per_month_max");

  return (
    <DashboardPanel title={title} subtitle={subtitle} tone="soft">
      <SignalRow label="Plan" value={billing.subscription.planName} />
      <SignalRow label="Status" value={<StatusBadge status={status} />} tone={status === "past_due" ? "warning" : "success"} />
      <SignalRow
        label="Renewal"
        value={renewalDays === null ? "-" : renewalDays >= 0 ? `${renewalDays} day(s)` : "Expired"}
        tone={renewalDays !== null && renewalDays <= 3 ? "warning" : "info"}
      />
      {renderProgress("Billable seats", billing.seatSummary.activeBillable, seatLimit)}
      {typeof payrollRunsUsed === "number" ? renderProgress("Payroll runs (sample)", payrollRunsUsed, payrollRunLimit) : null}
      {typeof payslipRowsUsed === "number" ? renderProgress("Payslips (sample)", payslipRowsUsed, payslipEmailLimit) : null}
      <div className="flex justify-end">
        <Link href="/app/billing" className="secondary-btn">Manage Billing</Link>
      </div>
    </DashboardPanel>
  );
};
