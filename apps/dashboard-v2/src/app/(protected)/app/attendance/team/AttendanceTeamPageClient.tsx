"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { assignGoApplied, fetchTeamAttendance } from "@/lib/client/api";
import type { TeamAttendanceRow } from "@/lib/types/attendance";
import { TeamAttendanceTable } from "@/components/attendance/TeamAttendanceTable";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { PageContainer, PageHeader, StatCard, StatGrid, SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";

export const AttendanceTeamPageClient = () => {
  const [rows, setRows] = useState<TeamAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [assigningGoKey, setAssigningGoKey] = useState<string | null>(null);

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

  const handleAssignGo = useCallback(async (row: TeamAttendanceRow) => {
    setAssigningGoKey(`${row.employee_id}:${row.attendance_date}`);
    setError(null);
    setMessage(null);
    try {
      const result = await assignGoApplied({
        employeeId: row.employee_id,
        attendanceDate: row.attendance_date,
        note: `GO Applied assigned for ${row.attendance_date}`,
      });
      if (!result.ok) {
        setError(result.error ?? "Unable to assign GO");
        return;
      }
      setMessage("GO Applied assigned.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign GO");
    } finally {
      setAssigningGoKey(null);
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.day_state === "present" || row.day_state === "clocked_out" || row.day_state === "on_break" || row.day_state === "late") {
          acc.present += 1;
        } else if (row.day_state === "leave_paid" || row.day_state === "leave_unpaid") {
          acc.onLeave += 1;
        } else if (row.day_state === "absent") {
          acc.absent += 1;
        } else if (row.day_state === "off_day") {
          acc.offDay += 1;
        } else if (row.day_state === "go_active" || row.day_state === "go_applied") {
          acc.goDays += 1;
        }
        return acc;
      },
      { total: 0, present: 0, onLeave: 0, absent: 0, offDay: 0, goDays: 0 }
    );
  }, [rows]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Attendance"
        title="Team attendance"
        description="Scoped workforce visibility for today, including leave, GO, off-day, and explicit absence states."
      />

      {loading ? <LoadingState label="Loading team attendance..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error ? (
        <>
          <StatGrid>
            <StatCard label="Employees in scope" value={summary.total} hint="All scoped rows, not just punch records" />
            <StatCard label="Present / active" value={summary.present} hint="Present, on break, late, or clocked out" />
            <StatCard label="On leave" value={summary.onLeave} hint="Paid and unpaid leave states" />
            <StatCard label="Absent" value={summary.absent} hint="Explicit attendance deduction state" />
            <StatCard label="Off day" value={summary.offDay} hint="No roster workday and no default deduction" />
            <StatCard label="GO states" value={summary.goDays} hint="GO Active and GO Applied" />
          </StatGrid>

          <SurfacePanel title="Workforce status table" description="Search employee status, payroll impact, leave, holiday, and shift context from one compact table.">
            {message ? <p className="mb-4 text-sm text-emerald-700">{message}</p> : null}
            <TeamAttendanceTable rows={rows} onAssignGo={handleAssignGo} assigningGoKey={assigningGoKey} />
          </SurfacePanel>
        </>
      ) : null}
    </PageContainer>
  );
};
