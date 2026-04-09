"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import {
  approveAttendanceCorrectionRequest,
  fetchAttendanceReviewQueue,
  rejectAttendanceCorrectionRequest,
} from "@/lib/client/api";
import type { AttendanceReviewListResponse, AttendanceReviewRow } from "@/lib/types/attendance";
import {
  ProfileTablePagination,
  ProfileTableShell,
  profileFieldClassName,
} from "@/components/profile/ProfileSectionPrimitives";

const PAGE_SIZE = 8;

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

export const CorrectionReviewTable = ({
  initialEmployeeId,
  focusId,
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
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      employeeId: employeeId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 100,
    }),
    [employeeId, dateFrom, dateTo],
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

  useEffect(() => {
    setPage(1);
  }, [employeeId, dateFrom, dateTo]);

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

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-3 md:grid-cols-3 xl:flex xl:flex-wrap xl:items-end">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Employee ID
              <input
                className={profileFieldClassName}
                type="text"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                placeholder="Employee UUID"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              From
              <input className={profileFieldClassName} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              To
              <input className={profileFieldClassName} type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Badge className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {rows.length} pending requests
            </Badge>
            <Button type="button" variant="secondary" className="rounded-full" onClick={refresh}>
              Refresh queue
            </Button>
          </div>
        </div>
      </div>

      {loading ? <LoadingState label="Loading correction review queue..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {actionError ? (
        <div className="rounded-[18px] border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">{actionError}</div>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No pending correction requests" subtitle="Nothing requires review right now." compact />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-3 lg:hidden">
            {visibleRows.map((row) => {
              const isPendingAction = pendingRowId === row.id;
              const isFocused = focusId && row.id === focusId;

              return (
                <div
                  key={row.id}
                  className="rounded-[22px] border border-slate-200 bg-white/95 p-4 shadow-sm"
                  style={isFocused ? { boxShadow: "0 0 0 2px rgba(37,99,235,0.25)" } : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-semibold text-slate-950">{row.employee?.full_name ?? "Unknown employee"}</p>
                      <p className="truncate text-xs text-slate-500">{row.attendance?.employee_id ?? "-"}</p>
                    </div>
                    <Badge className="rounded-full border border-amber-200 bg-amber-50 text-amber-700">Pending</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-500">Date</span>
                      <span className="text-right text-slate-900">{row.attendance?.attendance_date ?? "-"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-500">Original</span>
                      <div className="text-right text-slate-600">
                        <div>In {formatDateTime(row.attendance?.check_in)}</div>
                        <div>Out {formatDateTime(row.attendance?.check_out)}</div>
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-500">Requested</span>
                      <div className="text-right text-slate-600">
                        <div>In {formatDateTime(row.requested_check_in)}</div>
                        <div>Out {formatDateTime(row.requested_check_out)}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500">Reason</span>
                      <p className="text-slate-700">{row.reason}</p>
                    </div>
                    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                      Reject reason
                      <input
                        className={profileFieldClassName}
                        type="text"
                        placeholder="Required for reject"
                        value={rejectReasons[row.id] ?? ""}
                        onChange={(event) => setRejectReasons((current) => ({ ...current, [row.id]: event.target.value }))}
                        disabled={isPendingAction}
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" className="rounded-full" disabled={isPendingAction} onClick={() => void handleApprove(row)}>
                      {isPendingAction ? "Processing..." : "Approve"}
                    </Button>
                    <Button type="button" variant="secondary" className="rounded-full" disabled={isPendingAction} onClick={() => void handleReject(row)}>
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden lg:block">
            <ProfileTableShell>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Attendance Date</th>
                    <th className="px-4 py-3">Original Times</th>
                    <th className="px-4 py-3">Requested Times</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Reject Reason</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {visibleRows.map((row) => {
                    const isPendingAction = pendingRowId === row.id;
                    const isFocused = focusId && row.id === focusId;

                    return (
                      <tr key={row.id} style={isFocused ? { boxShadow: "inset 0 0 0 2px rgba(37,99,235,0.25)" } : undefined}>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">{row.employee?.full_name ?? "Unknown employee"}</p>
                            <p className="text-xs text-slate-500">{row.attendance?.employee_id ?? "-"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">{row.attendance?.attendance_date ?? "-"}</td>
                        <td className="px-4 py-3 align-top">
                          <div>In: {formatDateTime(row.attendance?.check_in)}</div>
                          <div>Out: {formatDateTime(row.attendance?.check_out)}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div>In: {formatDateTime(row.requested_check_in)}</div>
                          <div>Out: {formatDateTime(row.requested_check_out)}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="max-w-[280px] whitespace-pre-wrap break-words text-slate-700">{row.reason}</div>
                          <div className="mt-2 text-xs text-slate-500">Submitted: {formatDateTime(row.created_at)}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input
                            className={`${profileFieldClassName} min-w-[220px]`}
                            type="text"
                            placeholder="Required for reject"
                            value={rejectReasons[row.id] ?? ""}
                            onChange={(event) => setRejectReasons((current) => ({ ...current, [row.id]: event.target.value }))}
                            disabled={isPendingAction}
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-2">
                            <Button type="button" className="rounded-full" disabled={isPendingAction} onClick={() => void handleApprove(row)}>
                              {isPendingAction ? "Processing..." : "Approve"}
                            </Button>
                            <Button type="button" variant="secondary" className="rounded-full" disabled={isPendingAction} onClick={() => void handleReject(row)}>
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ProfileTableShell>
          </div>

          <ProfileTablePagination
            page={page}
            totalPages={totalPages}
            countLabel={`Showing ${visibleRows.length} of ${rows.length} pending requests`}
            onPrevious={() => setPage((value) => Math.max(1, value - 1))}
            onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
          />
        </div>
      ) : null}
    </div>
  );
};
