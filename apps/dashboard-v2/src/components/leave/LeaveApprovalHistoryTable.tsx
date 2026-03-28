import type { LeaveRequest } from "@/lib/types/leave";

export const LeaveApprovalHistoryTable = ({ requests }: { requests: LeaveRequest[] }) => {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/94 shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-semibold tracking-tight text-slate-950">Approval history</h3>
        <p className="mt-1 text-sm text-slate-600">Track which requests were approved, rejected, or cancelled after review.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {requests.map((req) => (
              <tr key={req.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{req.employee_name ?? req.employee_id}</td>
                <td className="px-4 py-3">{req.start_date} to {req.end_date}</td>
                <td className="px-4 py-3">{req.status}</td>
                <td className="px-4 py-3 text-slate-500">{req.approval_stage_label ?? "-"}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(req.approved_at ?? req.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No approval history yet</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};
