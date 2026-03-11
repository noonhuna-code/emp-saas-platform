"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAttendanceHistory } from "@/lib/client/api";
import type { AttendanceHistoryResponse, AttendanceHistoryRow } from "@/lib/types/attendance";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const formatTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatMinutes = (value: number | null | undefined): string => {
  if (typeof value !== "number") return "—";
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
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [query, refreshKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section className="card stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0 }}>Attendance History</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Filter by date range and status. Use the correction action per record when needed.
          </p>
        </div>
        <span className="badge">Page {page}</span>
      </div>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <label className="stack" style={{ minWidth: 180 }}>
          <span className="muted">From</span>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        </label>
        <label className="stack" style={{ minWidth: 180 }}>
          <span className="muted">To</span>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </label>
        <label className="stack" style={{ minWidth: 200 }}>
          <span className="muted">Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="corrected">Corrected</option>
            <option value="half_day">Half Day</option>
            <option value="pending">Pending</option>
          </select>
        </label>
      </div>

      {loading ? <LoadingState label="Loading attendance history..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && data && data.rows.length === 0 ? (
        <EmptyState title="No attendance records found" subtitle="Try adjusting the filters." />
      ) : null}

      {!loading && !error && data && data.rows.length > 0 ? (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Clock In / Out</th>
                  <th>Status</th>
                  <th>Worked</th>
                  <th>Correction</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.attendance_date)}</td>
                    <td>
                      <div>{row.shift_start_time ?? "—"} - {row.shift_end_time ?? "—"}</div>
                    </td>
                    <td>
                      <div>{formatTime(row.check_in)}</div>
                      <div className="muted">{formatTime(row.check_out)}</div>
                    </td>
                    <td>
                      <div>{row.status ?? "—"}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {row.is_absent ? "Absent" : row.is_late ? "Late" : " "}
                      </div>
                    </td>
                    <td>
                      <div>{formatMinutes(row.work_minutes)}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        OT: {formatMinutes(row.overtime_minutes)}
                      </div>
                    </td>
                    <td>{row.correction_status ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={row.is_locked}
                        onClick={() => onRequestCorrection(row)}
                      >
                        Request Correction
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">Total records: {data.total}</span>
            <div className="row">
              <button
                type="button"
                className="secondary-btn"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </button>
              <span className="badge">{page} / {totalPages}</span>
              <button
                type="button"
                className="secondary-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
};

