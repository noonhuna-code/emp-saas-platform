"use client";

import type { OvertimeRequest } from "@/lib/types/overtime";
import { StatusBadge } from "@/components/shared/StatusBadge";

const formatMinutes = (value: number) => {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours}h ${minutes}m`;
};

export const OvertimeHistoryTable = ({ rows }: { rows: OvertimeRequest[] }) => {
  return (
    <section className="card stack">
      <div>
        <h3>Overtime history</h3>
        <p className="muted">Review your submitted requests and outcomes.</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Minutes</th>
              <th>Status</th>
              <th>Timeline</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.request_date}</td>
                <td>{formatMinutes(row.requested_minutes)}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>
                  <div className="timeline">
                    <div className="timeline-item">Requested {row.created_at ?? row.request_date}</div>
                    {row.reviewed_at ? (
                      <div className="timeline-item">
                        {row.status === "approved" ? "Approved" : row.status === "rejected" ? "Rejected" : "Reviewed"} {row.reviewed_at}
                      </div>
                    ) : null}
                  </div>
                </td>
                <td>{row.rejection_reason ?? row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
