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
      <div className="stack" style={{ gap: 6 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="muted">{label}</span>
          <strong>{used}</strong>
        </div>
      </div>
    );
  }

  const percent = clampPercent((used / limit) * 100);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="muted">{label}</span>
        <strong>{used} / {limit}</strong>
      </div>
      <div className="progress" aria-label={`${label} usage`}>
        <div className="progress__bar" style={{ width: `${percent}%` }} />
        <span className="progress__label">{percent}%</span>
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
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Link href="/app/billing" className="secondary-btn">Manage Billing</Link>
      </div>
    </DashboardPanel>
  );
};

