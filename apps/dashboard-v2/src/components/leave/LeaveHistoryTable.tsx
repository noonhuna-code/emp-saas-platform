import type { LeaveRequest } from "@/lib/types/leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/button";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

export const LeaveHistoryTable = ({
  requests,
  onCancel,
  busy,
  page,
  hasNext,
  onPageChange,
}: {
  requests: LeaveRequest[];
  onCancel?: (requestId: string, employeeId: string) => void;
  busy?: boolean;
  page?: number;
  hasNext?: boolean;
  onPageChange?: (page: number) => void;
}) => {
  const currentPage = page ?? 1;

  return (
    <Card className="rounded-[24px] border border-slate-200/80 bg-white/92 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-950">Leave history</CardTitle>
        <p className="text-sm text-slate-600">Review requests, current stage, and cancellation status.</p>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <div className="overflow-hidden rounded-[22px] border border-slate-200">
          <div className="max-h-[360px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Approval stage</th>
                  <th className="px-4 py-3">Total days</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {requests.map((req) => (
                  <tr key={req.id} className="align-top">
                    <td className="px-4 py-4">{formatDate(req.start_date)} – {formatDate(req.end_date)}</td>
                    <td className="px-4 py-4">{req.leave_type_name ?? req.leave_type_id}</td>
                    <td className="px-4 py-4"><StatusChip label={req.status} compact /></td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-700">{req.approval_stage_label ?? "-"}</p>
                        {req.status === "pending" && req.next_approver_name ? <p className="text-xs text-slate-500">Next: {req.next_approver_name}</p> : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">{req.total_days}</td>
                    <td className="px-4 py-4">
                      {req.status === "pending" && onCancel ? (
                        <Button variant="secondary" size="sm" className="rounded-full" onClick={() => onCancel(req.id, req.employee_id)} disabled={busy}>
                          Cancel
                        </Button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">No leave requests yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {onPageChange ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-500">Page {currentPage}</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="rounded-full" type="button" disabled={currentPage <= 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" className="rounded-full" type="button" disabled={!hasNext} onClick={() => onPageChange(currentPage + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

