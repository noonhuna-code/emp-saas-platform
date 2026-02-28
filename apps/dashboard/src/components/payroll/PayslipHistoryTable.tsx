"use client";

import Link from "next/link";
import type { PayslipHistoryRow } from "@/lib/types/payroll";
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

export const PayslipHistoryTable = ({
  rows,
  showEmployeeColumn
}: {
  rows: PayslipHistoryRow[];
  showEmployeeColumn: boolean;
}) => {
  return (
    <section className="card stack">
      <div>
        <h3>Payslip history</h3>
        <p className="muted">Read-only payslip snapshots derived from persisted payroll entries.</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Period</th>
              {showEmployeeColumn ? <th>Employee</th> : null}
              <th>Net Salary</th>
              <th>Status</th>
              <th>Locked</th>
              <th>Processed At</th>
              <th>View</th>
              <th>Print</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.entryId}>
                <td>{formatPeriodLabel(row.period)}</td>
                {showEmployeeColumn ? <td>{row.employeeName}</td> : null}
                <td>{currency(row.netSalary)}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>
                  <StatusBadge
                    status={row.isLocked ? "locked" : "unlocked"}
                    tone={row.isLocked ? "success" : "warning"}
                  />
                </td>
                <td>{row.processedAt || "-"}</td>
                <td>
                  <Link href={`/app/payslips/${row.entryId}`}>View</Link>
                </td>
                <td>
                  <Link href={`/app/payslips/${row.entryId}/print`}>Print</Link>
                </td>
                <td>
                  <a href={`/api/payslips/${row.entryId}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
