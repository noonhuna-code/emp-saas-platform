import { useState } from "react";
import type { LeaveRequest } from "@/lib/types/leave";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export const LeaveReviewTable = ({
  requests,
  onApprove,
  onReject,
  onCancel,
  busy,
  focusId
}: {
  requests: LeaveRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, reason?: string) => void;
  onCancel: (requestId: string, employeeId: string) => void;
  busy?: boolean;
  focusId?: string;
}) => {
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<LeaveRequest | null>(null);

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/94 shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-semibold tracking-tight text-slate-950">Pending leave approvals</h3>
        <p className="mt-1 text-sm text-slate-600">Only requests waiting on your current approval stage appear here.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Attachment</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {requests.map((req) => (
              <tr key={req.id} className={focusId && req.id === focusId ? "bg-blue-50/60" : undefined}>
                <td className="px-4 py-3 font-medium text-slate-900">{req.employee_name ?? req.employee_id}</td>
                <td className="px-4 py-3">{req.start_date} to {req.end_date}</td>
                <td className="px-4 py-3">{req.leave_type_name ?? req.leave_type_id}</td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {req.approval_stage_label ?? "Pending review"}
                    </span>
                    {req.next_approver_name ? <p className="text-xs text-slate-500">Next: {req.next_approver_name}</p> : null}
                  </div>
                </td>
                <td className="px-4 py-3">{req.total_days}</td>
                <td className="px-4 py-3">
                  {req.attachments?.[0]?.download_url ? (
                    <a
                      className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                      href={req.attachments[0].download_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {req.attachments[0].file_name}
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(req.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="primary-btn" onClick={() => onApprove(req.id)} disabled={busy}>
                      Approve
                    </button>
                    <button className="secondary-btn" onClick={() => setRejecting(req.id)} disabled={busy}>
                      Reject
                    </button>
                    <button className="secondary-btn" onClick={() => setCancelling(req)} disabled={busy}>
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">No pending requests</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
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
      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel leave request"
        confirmLabel="Cancel request"
        busy={busy}
        onCancel={() => setCancelling(null)}
        onConfirm={() => {
          if (cancelling) {
            onCancel(cancelling.id, cancelling.employee_id);
          }
          setCancelling(null);
        }}
      />
    </div>
  );
};
