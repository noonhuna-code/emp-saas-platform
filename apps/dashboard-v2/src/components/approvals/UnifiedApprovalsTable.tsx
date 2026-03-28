import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";
import type { UnifiedApprovalItem } from "@/lib/types/approvals";

const formatAgeHours = (submittedAt: string): string => {
  const submitted = new Date(submittedAt);
  if (Number.isNaN(submitted.getTime())) return "-";
  const hours = Math.max(0, Math.floor((Date.now() - submitted.getTime()) / (1000 * 60 * 60)));
  return `${hours}h`;
};

const FILTER_OPTIONS: Array<{ id: "all" | "leave" | "attendance"; label: string }> = [
  { id: "all", label: "All" },
  { id: "leave", label: "Leave" },
  { id: "attendance", label: "Attendance" }
];

export const UnifiedApprovalsTable = ({
  items,
  onApprove,
  onReject,
  onCancel,
  busy,
  typeFilter,
  onTypeFilterChange
}: {
  items: UnifiedApprovalItem[];
  onApprove: (item: UnifiedApprovalItem) => void;
  onReject: (item: UnifiedApprovalItem, reason?: string) => void;
  onCancel: (item: UnifiedApprovalItem) => void;
  busy?: boolean;
  typeFilter?: "all" | "leave" | "attendance";
  onTypeFilterChange?: (value: "all" | "leave" | "attendance") => void;
}) => {
  const [rejectTarget, setRejectTarget] = useState<UnifiedApprovalItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<UnifiedApprovalItem | null>(null);

  const filteredItems = useMemo(() => {
    if (!typeFilter || typeFilter === "all") return items;
    return items.filter((item) => item.type === typeFilter);
  }, [items, typeFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">Pending decisions</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Sorted oldest first so aging requests surface before the backlog gets noisy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                (typeFilter ?? "all") === option.id
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/50 dark:bg-blue-500/10 dark:text-blue-200"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              }`}
              onClick={() => onTypeFilterChange?.(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          subtitle="This queue is clear for the current filter. New leave and attendance decisions will appear here."
          compact
        />
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/92 shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/70">
          <div className="hidden grid-cols-[120px_minmax(0,1fr)_180px_110px_minmax(0,1.2fr)_120px_200px] gap-3 border-b border-slate-200/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:text-slate-400 lg:grid">
            <span>Type</span>
            <span>Employee</span>
            <span>Submitted</span>
            <span>Age</span>
            <span>Summary</span>
            <span>Detail</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
            {filteredItems.map((item) => {
              const detailHref =
                item.type === "leave"
                  ? `/app/leave/review?focusId=${encodeURIComponent(item.id)}&employeeId=${encodeURIComponent(item.employee_id)}`
                  : `/app/attendance/review?focusId=${encodeURIComponent(item.id)}&employeeId=${encodeURIComponent(item.employee_id)}`;

              return (
                <div key={`${item.type}-${item.id}`} className="grid gap-4 px-5 py-4 lg:grid-cols-[120px_minmax(0,1fr)_180px_110px_minmax(0,1.2fr)_120px_200px] lg:items-start">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 lg:hidden">Type</div>
                    <StatusChip label={item.type === "leave" ? "Leave" : "Attendance"} tone={item.type === "leave" ? "info" : "warning"} compact />
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 lg:hidden">Employee</div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{item.employee_name ?? item.employee_id}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.employee_id}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 lg:hidden">Submitted</div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{new Date(item.submitted_at).toLocaleString()}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 lg:hidden">Age</div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{formatAgeHours(item.submitted_at)}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 lg:hidden">Summary</div>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{item.summary}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 lg:hidden">Detail</div>
                    <Link className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200" href={detailHref}>
                      Open detail
                    </Link>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 lg:hidden">Actions</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button className="primary-btn" onClick={() => onApprove(item)} disabled={busy}>
                        Approve
                      </button>
                      <button className="secondary-btn" onClick={() => setRejectTarget(item)} disabled={busy}>
                        Reject
                      </button>
                      {item.type === "leave" ? (
                        <button className="secondary-btn" onClick={() => setCancelTarget(item)} disabled={busy}>
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="Reject request"
        confirmLabel="Reject"
        requireReason
        busy={busy}
        onCancel={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (rejectTarget) {
            onReject(rejectTarget, reason);
          }
          setRejectTarget(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel leave request"
        confirmLabel="Cancel request"
        busy={busy}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) {
            onCancel(cancelTarget);
          }
          setCancelTarget(null);
        }}
      />
    </div>
  );
};
