import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/button";
import { ProfileTablePagination, ProfileTableShell, ProfileTableToolbar } from "@/components/profile/ProfileSectionPrimitives";
import type { LeaveRequest } from "@/lib/types/leave";

const PAGE_SIZE = 8;

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
  const [query, setQuery] = useState("");
  const [localPage, setLocalPage] = useState(1);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return requests;
    return requests.filter(
      (req) =>
        [
          req.leave_type_name,
          req.status,
          req.approval_stage_label,
          req.next_approver_name,
          req.start_date,
          req.end_date,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized)) ||
        (req.attachments ?? []).some((attachment) => attachment.file_name.toLowerCase().includes(normalized)),
    );
  }, [query, requests]);

  const totalLocalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((localPage - 1) * PAGE_SIZE, localPage * PAGE_SIZE);

  return (
    <Card className="rounded-[24px] border border-slate-200/80 bg-white/92 shadow-sm">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-950">Leave history</CardTitle>
          <p className="text-sm text-slate-600">Search requests, current stage, and cancellation status in one compact register.</p>
        </div>
        <ProfileTableToolbar
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            setLocalPage(1);
          }}
          placeholder="Search leave type, status, or next approver"
          countLabel={`${filteredRows.length} requests`}
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <ProfileTableShell>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Approval stage</th>
                <th className="px-4 py-3">Total days</th>
                <th className="px-4 py-3">Attachment</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {pageRows.map((req) => (
                <tr key={req.id} className="align-top">
                  <td className="px-4 py-4">{formatDate(req.start_date)} - {formatDate(req.end_date)}</td>
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
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-sm text-slate-500">No leave requests match the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </ProfileTableShell>

        <div className="flex flex-col gap-3">
          <ProfileTablePagination
            page={localPage}
            totalPages={totalLocalPages}
            countLabel={`Showing ${pageRows.length} of ${filteredRows.length} requests`}
            onPrevious={() => setLocalPage((value) => Math.max(1, value - 1))}
            onNext={() => setLocalPage((value) => Math.min(totalLocalPages, value + 1))}
          />
          {onPageChange ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-3">
              <span className="text-sm text-slate-500">Server page {currentPage}</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="rounded-full" type="button" disabled={currentPage <= 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))}>
                  Previous server page
                </Button>
                <Button variant="secondary" size="sm" className="rounded-full" type="button" disabled={!hasNext} onClick={() => onPageChange(currentPage + 1)}>
                  Next server page
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
