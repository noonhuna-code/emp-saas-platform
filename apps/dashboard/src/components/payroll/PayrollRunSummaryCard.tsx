"use client";

import type { PayrollRunDetailResponse } from "@/lib/types/payroll";
import { StatusBadge } from "@/components/shared/StatusBadge";

const currency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);

const formatPeriod = (year: number, month: number) => {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
};

export const PayrollRunSummaryCard = ({ data }: { data: PayrollRunDetailResponse }) => {
  return (
    <section className="card stack">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Payroll Run Detail</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            {formatPeriod(data.run.year, data.run.month)} ({data.run.start_date} to {data.run.end_date})
          </p>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <StatusBadge status={data.run.status} />
          <StatusBadge status={data.run.locked ? "locked" : "unlocked"} tone={data.run.locked ? "success" : "warning"} />
        </div>
      </div>

      <div className="form-grid form-grid--two">
        <div className="card card--nested stack">
          <span className="muted">Headcount</span>
          <strong>{data.summary.headcount}</strong>
          <span className="muted">Processed: {data.summary.processedCount}</span>
        </div>
        <div className="card card--nested stack">
          <span className="muted">Total Net</span>
          <strong>{currency(data.summary.totalNet)}</strong>
          <span className="muted">Deductions: {currency(data.summary.totalDeductions)}</span>
        </div>
        <div className="card card--nested stack">
          <span className="muted">Total Earnings</span>
          <strong>{currency(data.summary.totalEarnings)}</strong>
          <span className="muted">Allowances: {currency(data.summary.totalAllowances)}</span>
        </div>
        <div className="card card--nested stack">
          <span className="muted">Run ID</span>
          <code style={{ wordBreak: "break-all" }}>{data.run.id}</code>
          <span className="muted">Locked at: {data.run.locked_at ?? "—"}</span>
        </div>
      </div>
    </section>
  );
};
