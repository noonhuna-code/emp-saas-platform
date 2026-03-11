"use client";

import type { PayslipDetailResponse } from "@/lib/types/payroll";
import { StatusBadge } from "@/components/shared/StatusBadge";

const currency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);

const formatPeriodLabel = (period: string) => {
  const [yearPart, monthPart] = period.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return period;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
};

export const PayslipDetailView = ({ data }: { data: PayslipDetailResponse }) => {
  return (
    <div className="stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Company Payslip</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              {formatPeriodLabel(data.period)} | Processed at {data.processedAt || "-"}
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <StatusBadge status={data.status} />
            <StatusBadge
              status={data.isLocked ? "locked" : "unlocked"}
              tone={data.isLocked ? "success" : "warning"}
            />
          </div>
        </div>
      </section>

      <section className="card stack">
        <div>
          <h3>Employee Summary</h3>
          <p className="muted">Tenant-scoped payroll snapshot for the selected employee and period.</p>
        </div>
        <div className="form-grid form-grid--two">
          <div className="card card--nested stack">
            <span className="muted">Employee Name</span>
            <strong>{data.employee.name}</strong>
          </div>
          <div className="card card--nested stack">
            <span className="muted">Employee Code</span>
            <strong>{data.employee.code ?? "-"}</strong>
          </div>
          <div className="card card--nested stack">
            <span className="muted">Entry ID</span>
            <code style={{ wordBreak: "break-all" }}>{data.entryId}</code>
          </div>
          <div className="card card--nested stack">
            <span className="muted">Payroll Period</span>
            <strong>{formatPeriodLabel(data.period)}</strong>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div>
          <h3>Earnings</h3>
          <p className="muted">Stored payroll entry snapshot values. No live recalculation.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.earnings.map((item) => (
              <tr key={`earn-${item.label}`}>
                <td>{item.label}</td>
                <td>{currency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card stack">
        <div>
          <h3>Deductions</h3>
          <p className="muted">Stored payroll entry snapshot values. No live recalculation.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.deductions.map((item) => (
              <tr key={`ded-${item.label}`}>
                <td>{item.label}</td>
                <td>{currency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card stack">
        <div>
          <h3>Totals</h3>
          <p className="muted">Persisted totals from payroll entry snapshot.</p>
        </div>
        <div className="form-grid form-grid--three">
          <div className="card card--nested stack">
            <span className="muted">Gross</span>
            <strong>{currency(data.totals.gross)}</strong>
          </div>
          <div className="card card--nested stack">
            <span className="muted">Deductions</span>
            <strong>{currency(data.totals.deductions)}</strong>
          </div>
          <div className="card card--nested stack">
            <span className="muted">Net</span>
            <strong>{currency(data.totals.net)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
};
