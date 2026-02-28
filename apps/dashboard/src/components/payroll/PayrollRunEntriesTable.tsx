"use client";

import type { PayrollRunEntryRow } from "@/lib/types/payroll";
import { StatusBadge } from "@/components/shared/StatusBadge";

const currency = (value: number | null) => {
  const normalized = Number(value ?? 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(normalized);
};

export const PayrollRunEntriesTable = ({ rows }: { rows: PayrollRunEntryRow[] }) => {
  return (
    <section className="card stack">
      <div>
        <h3>Payroll entries</h3>
        <p className="muted">Line items included in this payroll run. Tenant-scoped and read-only.</p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee Code</th>
              <th>Processed</th>
              <th>Base Salary</th>
              <th>Snapshot</th>
              <th>Earnings</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Net Salary</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.employee_name ?? "Employee"}</td>
                <td>{row.employee_code ?? "—"}</td>
                <td>
                  <StatusBadge
                    status={row.is_processed ? "processed" : "pending"}
                    tone={row.is_processed ? "success" : "warning"}
                  />
                </td>
                <td>{currency(row.base_salary)}</td>
                <td>{currency(row.base_salary_snapshot)}</td>
                <td>{currency(row.total_earnings)}</td>
                <td>{currency(row.total_allowances)}</td>
                <td>{currency(row.total_deductions)}</td>
                <td>{currency(row.net_salary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
