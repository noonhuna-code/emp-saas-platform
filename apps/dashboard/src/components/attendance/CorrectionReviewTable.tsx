"use client";

import { useEffect, useMemo, useState } from "react";
import {
  approveAttendanceCorrectionRequest,
  fetchAttendanceReviewQueue,
  rejectAttendanceCorrectionRequest
} from "@/lib/client/api";
import type { AttendanceReviewListResponse, AttendanceReviewRow } from "@/lib/types/attendance";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
};

export const CorrectionReviewTable = ({
  initialEmployeeId,
  focusId
}: {
  initialEmployeeId?: string;
  focusId?: string;
}) => {
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<AttendanceReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const filters = useMemo(
    () => ({
      employeeId: employeeId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 100
    }),
    [employeeId, dateFrom, dateTo]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchAttendanceReviewQueue(filters)
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load review queue");
          setData(null);
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load review queue");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  const handleApprove = async (row: AttendanceReviewRow) => {
    if (!window.confirm(`Approve attendance correction for ${row.employee?.full_name ?? row.attendance?.employee_id ?? "employee"}?`)) {
      return;
    }

    setPendingRowId(row.id);
    setActionError(null);

    try {
      const result = await approveAttendanceCorrectionRequest(row.id);
      if (!result.ok) {
        if (result.error === "Authentication required") {
          window.location.href = "/login";
          return;
        }
        if (result.error === "Permission denied") {
          window.location.href = "/403";
          return;
        }
        setActionError(result.error ?? "Unable to approve correction");
        return;
      }

      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to approve correction");
    } finally {
      setPendingRowId(null);
    }
  };

  const handleReject = async (row: AttendanceReviewRow) => {
    const reason = (rejectReasons[row.id] ?? "").trim();
    if (!reason) {
      setActionError("Rejection reason is required");
      return;
    }

    if (!window.confirm(`Reject attendance correction for ${row.employee?.full_name ?? row.attendance?.employee_id ?? "employee"}?`)) {
      return;
    }

    setPendingRowId(row.id);
    setActionError(null);

    try {
      const result = await rejectAttendanceCorrectionRequest(row.id, reason);
      if (!result.ok) {
        if (result.error === "Authentication required") {
          window.location.href = "/login";
          return;
        }
        if (result.error === "Permission denied") {
          window.location.href = "/403";
          return;
        }
        setActionError(result.error ?? "Unable to reject correction");
        return;
      }

      setRejectReasons((current) => ({ ...current, [row.id]: "" }));
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to reject correction");
    } finally {
      setPendingRowId(null);
    }
  };

  return (
    <section className="card stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0 }}>Pending Corrections</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Approvals are non-optimistic. The table refreshes after the server confirms the action.
          </p>
        </div>
        <span className="badge">Status: Pending</span>
      </div>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <label className="stack" style={{ minWidth: 220 }}>
          <span className="muted">Employee (ID filter)</span>
          <input type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Employee UUID" />
        </label>
        <label className="stack" style={{ minWidth: 180 }}>
          <span className="muted">From</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="stack" style={{ minWidth: 180 }}>
          <span className="muted">To</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
      </div>

      {loading ? <LoadingState label="Loading correction review queue..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && data && data.rows.length === 0 ? (
        <EmptyState title="No pending correction requests" subtitle="Nothing requires review right now." />
      ) : null}
      {actionError ? <p className="error" style={{ margin: 0 }}>{actionError}</p> : null}

      {!loading && !error && data && data.rows.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Attendance Date</th>
                <th>Original Times</th>
                <th>Requested Times</th>
                <th>Reason</th>
                <th>Reject Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const isPendingAction = pendingRowId === row.id;
                const isFocused = focusId && row.id === focusId;
                return (
                  <tr key={row.id} style={isFocused ? { outline: "2px solid var(--accent)", outlineOffset: 2 } : undefined}>
                    <td>
                      <div>{row.employee?.full_name ?? "Unknown Employee"}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{row.attendance?.employee_id ?? "—"}</div>
                    </td>
                    <td>{row.attendance?.attendance_date ?? "—"}</td>
                    <td>
                      <div>In: {formatDateTime(row.attendance?.check_in)}</div>
                      <div>Out: {formatDateTime(row.attendance?.check_out)}</div>
                    </td>
                    <td>
                      <div>In: {formatDateTime(row.requested_check_in)}</div>
                      <div>Out: {formatDateTime(row.requested_check_out)}</div>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ whiteSpace: "pre-wrap" }}>{row.reason}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Submitted: {formatDateTime(row.created_at)}
                      </div>
                    </td>
                    <td style={{ minWidth: 220 }}>
                      <input
                        type="text"
                        placeholder="Required for reject"
                        value={rejectReasons[row.id] ?? ""}
                        onChange={(e) =>
                          setRejectReasons((current) => ({ ...current, [row.id]: e.target.value }))
                        }
                        disabled={isPendingAction}
                        style={{
                          width: "100%",
                          border: "1px solid var(--line)",
                          borderRadius: 10,
                          padding: "10px 12px"
                        }}
                      />
                    </td>
                    <td>
                      <div className="stack">
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => handleApprove(row)}
                          disabled={isPendingAction}
                        >
                          {isPendingAction ? "Processing..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => handleReject(row)}
                          disabled={isPendingAction}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
};
