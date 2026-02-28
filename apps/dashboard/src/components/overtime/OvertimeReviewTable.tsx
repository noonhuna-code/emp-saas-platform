"use client";

import { useState } from "react";
import type { OvertimeRequest } from "@/lib/types/overtime";
import { StatusBadge } from "@/components/shared/StatusBadge";

export const OvertimeReviewTable = ({
  rows,
  onApprove,
  onReject
}: {
  rows: OvertimeRequest[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}) => {
  const formatMinutes = (value: number) => {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${hours}h ${minutes}m`;
  };

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const handleReject = async (id: string) => {
    if (!reason.trim()) return;
    await onReject(id, reason.trim());
    setRejectingId(null);
    setReason("");
  };

  return (
    <section className="card stack">
      <div>
        <h3>Pending overtime approvals</h3>
        <p className="muted">Approve or reject team overtime requests.</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Date</th>
              <th>Minutes</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Reason</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.employee_id}</td>
                <td>{row.request_date}</td>
                <td>{formatMinutes(row.requested_minutes)}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>{row.created_at ?? "-"}</td>
                <td>{row.reason}</td>
                <td>
                  {rejectingId === row.id ? (
                    <div className="stack" style={{ gap: 8 }}>
                      <input
                        placeholder="Rejection reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                      <div className="row">
                        <button className="secondary-btn" type="button" onClick={() => setRejectingId(null)}>Cancel</button>
                        <button className="primary-btn" type="button" onClick={() => handleReject(row.id)}>Confirm</button>
                      </div>
                    </div>
                  ) : (
                    <div className="row">
                      <button className="secondary-btn" type="button" onClick={() => onApprove(row.id)}>Approve</button>
                      <button className="secondary-btn" type="button" onClick={() => setRejectingId(row.id)}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
