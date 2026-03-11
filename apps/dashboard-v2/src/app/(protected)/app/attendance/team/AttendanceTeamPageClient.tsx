"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchTeamAttendance } from "@/lib/client/api";
import type { TeamAttendanceRow } from "@/lib/types/attendance";
import { TeamAttendanceTable } from "@/components/attendance/TeamAttendanceTable";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

export const AttendanceTeamPageClient = () => {
  const [rows, setRows] = useState<TeamAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTeamAttendance();
      if (!result.ok || !result.data) {
        setError(result.error ?? "Unable to load team attendance");
        setRows([]);
        return;
      }
      setRows(result.data.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load team attendance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Team Attendance</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Live view of today's team attendance status.
        </p>
      </section>

      {loading ? <LoadingState label="Loading team attendance..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error ? <TeamAttendanceTable rows={rows} /> : null}
    </div>
  );
};

