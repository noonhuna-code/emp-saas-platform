"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AttendanceClockActionState } from "./actions";
import { fetchAttendanceToday } from "@/lib/client/api";
import type { AttendanceHistoryRow, AttendanceTodayResponse } from "@/lib/types/attendance";
import { TodayAttendanceCard } from "@/components/attendance/TodayAttendanceCard";
import { ClockActions } from "@/components/attendance/ClockActions";
import { AttendanceHistoryTable } from "@/components/attendance/AttendanceHistoryTable";
import { CorrectionRequestDialog } from "@/components/attendance/CorrectionRequestDialog";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

type ClockActionFn = (
  prevState: AttendanceClockActionState,
  formData: FormData
) => Promise<AttendanceClockActionState>;

export const AttendancePageClient = ({
  clockInAction,
  clockOutAction
}: {
  clockInAction: ClockActionFn;
  clockOutAction: ClockActionFn;
}) => {
  const [todayData, setTodayData] = useState<AttendanceTodayResponse | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceHistoryRow | null>(null);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);

  const loadToday = useCallback(async () => {
    setLoadingToday(true);
    setTodayError(null);

    try {
      const result = await fetchAttendanceToday();
      if (!result.ok || !result.data) {
        setTodayError(result.error ?? "Unable to load attendance");
        setTodayData(null);
        return;
      }
      setTodayData(result.data);
    } catch (error) {
      setTodayError(error instanceof Error ? error.message : "Unable to load attendance");
      setTodayData(null);
    } finally {
      setLoadingToday(false);
    }
  }, []);

  useEffect(() => {
    void loadToday();
  }, [loadToday, refreshKey]);

  const actionDisabledState = useMemo(() => {
    if (!todayData) {
      return {
        canClockIn: false,
        canClockOut: false
      };
    }

    const locked = todayData.record?.is_locked ?? false;
    if (locked) {
      return {
        canClockIn: false,
        canClockOut: false
      };
    }

    switch (todayData.currentStatus) {
      case "not_clocked_in":
        return { canClockIn: true, canClockOut: false };
      case "clocked_in":
      case "on_break":
        return { canClockIn: false, canClockOut: true };
      case "clocked_out":
      default:
        return { canClockIn: false, canClockOut: false };
    }
  }, [todayData]);

  const handleClockActionComplete = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const handleRequestCorrection = useCallback((record: AttendanceHistoryRow) => {
    setSelectedRecord(record);
    setCorrectionDialogOpen(true);
  }, []);

  const handleCorrectionSubmitted = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0 }}>Attendance</h1>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Phase 2 Attendance Core. All mutations run through server-side service wrappers.
            </p>
          </div>
          {todayData ? <span className="badge">Today: {todayData.todayDate}</span> : null}
        </div>
      </section>

      {loadingToday ? <LoadingState label="Loading today attendance..." /> : null}
      {!loadingToday && todayError ? <ErrorState message={todayError} /> : null}

      {!loadingToday && !todayError && todayData ? (
        <>
          <TodayAttendanceCard data={todayData} />

          <ClockActions
            employeeId={todayData.employeeId}
            locked={todayData.record?.is_locked ?? false}
            canClockIn={actionDisabledState.canClockIn}
            canClockOut={actionDisabledState.canClockOut}
            clockInAction={clockInAction}
            clockOutAction={clockOutAction}
            onCompleted={handleClockActionComplete}
          />

          <AttendanceHistoryTable
            refreshKey={refreshKey}
            onRequestCorrection={handleRequestCorrection}
          />

          <CorrectionRequestDialog
            open={correctionDialogOpen}
            record={selectedRecord}
            onClose={() => setCorrectionDialogOpen(false)}
            onSubmitted={handleCorrectionSubmitted}
          />
        </>
      ) : null}
    </div>
  );
};

