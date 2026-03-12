"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAttendanceHistory } from "@/lib/client/api";
import type { AttendanceHistoryResponse, AttendanceHistoryRow } from "@/lib/types/attendance";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const [data, setData] = useState<AttendanceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
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

    void fetchAttendanceHistory(query)
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
  }, [query, refreshKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          From
          <input className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/60" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          To
          <input className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/60" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 md:col-span-1 xl:col-span-2">
          Status
          <select className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/60" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
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
      {!loading && !error && data && data.rows.length === 0 ? (
        <EmptyState title="No attendance records found" subtitle="Try adjusting the filters or come back after your next shift." />
      ) : null}

      {!loading && !error && data && data.rows.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
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
              <tbody className="divide-y divide-slate-200/80 bg-white/70 dark:divide-slate-800 dark:bg-slate-950/40">
                {data.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 align-top">{formatDate(row.attendance_date)}</td>
                    <td className="px-4 py-3 align-top">{row.shift_start_time ?? "-"} - {row.shift_end_time ?? "-"}</td>
                    <td className="px-4 py-3 align-top">
                      <div>{formatTime(row.check_in)}</div>
                      <div className="text-slate-500 dark:text-slate-400">{formatTime(row.check_out)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        <Badge className="rounded-full px-2.5 py-1">{row.status ?? "-"}</Badge>
                        {row.is_absent ? <div className="text-xs text-red-600 dark:text-red-400">Absent</div> : null}
                        {!row.is_absent && row.is_late ? <div className="text-xs text-amber-600 dark:text-amber-400">Late</div> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div>{formatMinutes(row.work_minutes)}</div>
                      <div className="text-slate-500 dark:text-slate-400">OT: {formatMinutes(row.overtime_minutes)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">{row.correction_status ?? "-"}</td>
                    <td className="px-4 py-3 align-top">
                      <Button type="button" variant="secondary" size="sm" disabled={row.is_locked} onClick={() => onRequestCorrection(row)}>
                        Request correction
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">Total records: {data.total}</span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                Previous
              </Button>
              <Badge className="rounded-full px-3 py-1.5">{page} / {totalPages}</Badge>
              <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

