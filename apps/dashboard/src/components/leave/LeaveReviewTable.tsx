import { useState } from "react";
import type { LeaveRequest } from "@/lib/types/leave";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export const LeaveReviewTable = ({
  requests,
  onApprove,
  onReject,
  busy,
  focusId
}: {
  requests: LeaveRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, reason?: string) => void;
  busy?: boolean;
  focusId?: string;
}) => {
  const [rejecting, setRejecting] = useState<string | null>(null);

  return (
    <div className="card stack">
      <h3>Pending Leave Approvals</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Dates</th>
            <th>Type</th>
            <th>Days</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id} style={focusId && req.id === focusId ? { outline: "2px solid var(--accent)", outlineOffset: 2 } : undefined}>
              <td>{req.employee_name ?? req.employee_id}</td>
              <td>{req.start_date} ? {req.end_date}</td>
              <td>{req.leave_type_name ?? req.leave_type_id}</td>
              <td>{req.total_days}</td>
              <td>{req.created_at}</td>
              <td className="row" style={{ gap: "8px" }}>
                <button className="primary-btn" onClick={() => onApprove(req.id)} disabled={busy}>
                  Approve
                </button>
                <button className="secondary-btn" onClick={() => setRejecting(req.id)} disabled={busy}>
                  Reject
                </button>
              </td>
            </tr>
          ))}
          {requests.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">No pending requests</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <ConfirmDialog
        open={Boolean(rejecting)}
        title="Reject leave request"
        confirmLabel="Reject"
        requireReason
        busy={busy}
        onCancel={() => setRejecting(null)}
        onConfirm={(reason) => {
          if (rejecting) {
            onReject(rejecting, reason);
          }
          setRejecting(null);
        }}
      />
    </div>
  );
};
