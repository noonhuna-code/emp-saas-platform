"use client";

import Link from "next/link";
import type { PayrollRunRow } from "@/lib/types/payroll";
import { StatusBadge } from "@/components/shared/StatusBadge";

const formatPeriod = (row: PayrollRunRow) => {
  const date = new Date(Date.UTC(row.year, row.month - 1, 1));
  return date.toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
};

export const PayrollRunsTable = ({ rows }: { rows: PayrollRunRow[] }) => {
  return (
    <section className="card stack">
      <div>
        <h3>Payroll history</h3>
        <p className="muted">Latest payroll runs for your company. Locked runs are immutable.</p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Status</th>
              <th>Locked</th>
              <th>Date Range</th>
              <th>Locked At</th>
              <th>Created</th>
              <th>Run ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatPeriod(row)}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>
                  <StatusBadge
                    status={row.locked ? "locked" : "unlocked"}
                    tone={row.locked ? "success" : "warning"}
                  />
                </td>
                <td>{row.start_date} to {row.end_date}</td>
                <td>{row.locked_at ?? "—"}</td>
                <td>{row.created_at ?? "—"}</td>
                <td><code>{row.id}</code></td>
                <td>
                  <Link href={`/app/payroll/${row.id}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
