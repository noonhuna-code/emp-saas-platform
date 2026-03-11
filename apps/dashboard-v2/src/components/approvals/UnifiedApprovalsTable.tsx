import type { UnifiedApprovalItem } from "@/lib/types/approvals";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import Link from "next/link";
import { useMemo, useState } from "react";

const formatAgeHours = (submittedAt: string): string => {
  const submitted = new Date(submittedAt);
  if (Number.isNaN(submitted.getTime())) return "—";
  const hours = Math.max(0, Math.floor((Date.now() - submitted.getTime()) / (1000 * 60 * 60)));
  return `${hours}h`;
};

export const UnifiedApprovalsTable = ({
  items,
  onApprove,
  onReject,
  busy,
  typeFilter,
  onTypeFilterChange
}: {
  items: UnifiedApprovalItem[];
  onApprove: (item: UnifiedApprovalItem) => void;
  onReject: (item: UnifiedApprovalItem, reason?: string) => void;
  busy?: boolean;
  typeFilter?: "all" | "leave" | "attendance";
  onTypeFilterChange?: (value: "all" | "leave" | "attendance") => void;
}) => {
  const [rejectTarget, setRejectTarget] = useState<UnifiedApprovalItem | null>(null);
  const filteredItems = useMemo(() => {
    if (!typeFilter || typeFilter === "all") return items;
    return items.filter((item) => item.type === typeFilter);
  }, [items, typeFilter]);

  return (
    <div className="card stack">
      <h3>Pending Approvals</h3>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <span className="muted">Sorted oldest first. SLA shows age in hours.</span>
        <label className="row" style={{ gap: "8px" }}>
          <span className="muted">Filter</span>
          <select
            value={typeFilter ?? "all"}
            onChange={(e) => onTypeFilterChange?.(e.target.value as "all" | "leave" | "attendance")}
          >
            <option value="all">All</option>
            <option value="leave">Leave</option>
            <option value="attendance">Attendance</option>
          </select>
        </label>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Employee</th>
            <th>Submitted</th>
            <th>SLA (hrs)</th>
            <th>Summary</th>
            <th>View</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => {
            const detailHref =
              item.type === "leave"
                ? `/app/leave/review?focusId=${encodeURIComponent(item.id)}&employeeId=${encodeURIComponent(item.employee_id)}`
                : `/app/attendance/review?focusId=${encodeURIComponent(item.id)}&employeeId=${encodeURIComponent(item.employee_id)}`;
            return (
            <tr key={`${item.type}-${item.id}`}>
              <td>{item.type}</td>
              <td>{item.employee_name ?? item.employee_id}</td>
              <td>{item.submitted_at}</td>
              <td>{formatAgeHours(item.submitted_at)}</td>
              <td>{item.summary}</td>
              <td>
                <Link className="link" href={detailHref}>View</Link>
              </td>
              <td className="row" style={{ gap: "8px" }}>
                <button className="primary-btn" onClick={() => onApprove(item)} disabled={busy}>
                  Approve
                </button>
                <button className="secondary-btn" onClick={() => setRejectTarget(item)} disabled={busy}>
                  Reject
                </button>
              </td>
            </tr>
          )})}
          {filteredItems.length === 0 ? (
            <tr>
              <td colSpan={7} className="muted">No pending approvals</td>
            </tr>
          ) : null}
        </tbody>
      </table>
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
    </div>
  );
};
