import type { LeaveRequest } from "@/lib/types/leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

export const LeaveStatusTimeline = ({ request }: { request?: LeaveRequest | null }) => {
  if (!request) {
    return (
      <Card className="rounded-[24px] border border-slate-200/80 bg-white/92 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-950">Request timeline</CardTitle>
          <p className="text-sm text-slate-600">Select a leave request to inspect its approval journey.</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-600">
            No request selected yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = [
    { label: "Submitted", date: request.created_at },
    request.approval_stage_label ? { label: "Current stage", date: request.updated_at, meta: request.approval_stage_label } : null,
    request.approved_at ? { label: "Reviewed", date: request.approved_at } : null,
    { label: "Last updated", date: request.updated_at },
  ].filter(Boolean) as Array<{ label: string; date: string; meta?: string }>;

  return (
    <Card className="rounded-[24px] border border-slate-200/80 bg-white/92 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-slate-950">Request timeline</CardTitle>
            <p className="text-sm text-slate-600">Track how the current leave request moved through the workflow.</p>
          </div>
          <Badge className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
            {request.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.meta ?? "Leave workflow"}</p>
            </div>
            <p className="text-sm text-slate-600">{formatDate(item.date)}</p>
          </div>
        ))}
        {request.status === "pending" && request.next_approver_name ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            Next approver: <span className="font-medium text-slate-900">{request.next_approver_name}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

