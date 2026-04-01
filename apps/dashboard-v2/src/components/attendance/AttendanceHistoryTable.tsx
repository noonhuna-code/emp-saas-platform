"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { fetchAttendanceHistory } from "@/lib/client/api";
import type { AttendanceHistoryResponse, AttendanceHistoryRow } from "@/lib/types/attendance";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ProfileTablePagination,
  ProfileTableShell,
} from "@/components/profile/ProfileSectionPrimitives";

const toolbarFieldClassName =
  "h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const formatTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatMinutes = (value: number | null | undefined): string => {
  if (typeof value !== "number") return "-";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours}h ${minutes}m`;
};

const computeLiveWorkedMinutes = (checkIn: string | null | undefined, checkOut: string | null | undefined): number | null => {
  if (!checkIn || checkOut) return null;
  const startedAt = new Date(checkIn);
  if (Number.isNaN(startedAt.getTime())) return null;
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 60000));
  return elapsed;
};

const presentStatusLabel = (row: AttendanceHistoryRow): string => {
  if (row.is_absent) return "Absent";
  if (row.is_late) return "Late";
  if (row.check_in && !row.check_out) return "Clocked in";
  if (row.check_in && row.check_out) return "Clocked out";
  if (!row.status) return "-";
  return row.status.replace(/_/g, " ");
};

export const AttendanceHistoryTable = ({
  refreshKey,
  onRequestCorrection
}: {
  refreshKey: number;
  onRequestCorrection: (record: AttendanceHistoryRow) => void;
}) => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<AttendanceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiQuery = useMemo(
    () => ({
      page,
      pageSize,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: status || undefined
    }),
    [page, pageSize, dateFrom, dateTo, status]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchAttendanceHistory(apiQuery)
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load attendance history");
          setData(null);
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load attendance history");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [apiQuery, refreshKey]);

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [
        row.attendance_date,
        row.status,
        row.correction_status,
        row.shift_start_time,
        row.shift_end_time,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [data?.rows, query]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(280px,1.2fr)_220px_220px_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${toolbarFieldClassName} w-full pl-10`}
            type="text"
            value={query}
            placeholder="Search date, status, or shift"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          From
          <input className={toolbarFieldClassName} type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          To
          <input className={toolbarFieldClassName} type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Status
          <select className={toolbarFieldClassName} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="corrected">Corrected</option>
            <option value="half_day">Half day</option>
            <option value="pending">Pending</option>
          </select>
        </label>
      </div>

      {loading ? <LoadingState label="Loading attendance history..." description="Filtering recent attendance logs for this employee." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && data && filteredRows.length === 0 ? (
        <EmptyState title="No attendance records found" subtitle="Try a different filter or come back after your next shift." />
      ) : null}

      {!loading && !error && data && filteredRows.length > 0 ? (
        <>
          <ProfileTableShell>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3">Clock in / out</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Worked</th>
                  <th className="px-4 py-3">Correction</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white/70">
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 align-top">{formatDate(row.attendance_date)}</td>
                    <td className="px-4 py-3 align-top">{row.shift_start_time ?? "-"} - {row.shift_end_time ?? "-"}</td>
                    <td className="px-4 py-3 align-top">
                      <div>{formatTime(row.check_in)}</div>
                      <div className="text-slate-500">{formatTime(row.check_out)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        <Badge className="rounded-full px-2.5 py-1">{presentStatusLabel(row)}</Badge>
                        {row.is_absent ? <div className="text-xs text-red-600">Absent</div> : null}
                        {!row.is_absent && row.is_late ? <div className="text-xs text-amber-600">Late</div> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div>{formatMinutes(row.work_minutes ?? computeLiveWorkedMinutes(row.check_in, row.check_out))}</div>
                      <div className="text-slate-500">OT: {formatMinutes(row.overtime_minutes)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">{row.correction_status ?? "-"}</td>
                    <td className="px-4 py-3 align-top">
                      <Button type="button" variant="secondary" size="sm" className="rounded-full" disabled={row.is_locked} onClick={() => onRequestCorrection(row)}>
                        Request correction
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ProfileTableShell>

          <ProfileTablePagination
            page={page}
            totalPages={totalPages}
            countLabel={`Showing ${filteredRows.length} rows on page ${page} of ${totalPages}`}
            onPrevious={() => setPage((value) => Math.max(1, value - 1))}
            onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
          />
        </>
      ) : null}
    </div>
  );
};
