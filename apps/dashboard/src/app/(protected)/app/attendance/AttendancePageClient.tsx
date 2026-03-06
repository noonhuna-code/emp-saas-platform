"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AttendanceClockActionState } from "./actions";
import { fetchAttendanceToday, peekCachedResult } from "@/lib/client/api";
import type { AttendanceHistoryRow, AttendanceTodayResponse } from "@/lib/types/attendance";
import { TodayAttendanceCard } from "@/components/attendance/TodayAttendanceCard";
import { ClockActions } from "@/components/attendance/ClockActions";
import { AttendanceHistoryTable } from "@/components/attendance/AttendanceHistoryTable";
import { CorrectionRequestDialog } from "@/components/attendance/CorrectionRequestDialog";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const cachedToday = peekCachedResult<AttendanceTodayResponse>("/api/attendance/today");
  const [todayData, setTodayData] = useState<AttendanceTodayResponse | null>(cachedToday?.ok ? (cachedToday.data ?? null) : null);
  const [loadingToday, setLoadingToday] = useState(!(cachedToday?.ok && cachedToday.data));
  const [todayError, setTodayError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceHistoryRow | null>(null);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);

  const loadToday = useCallback(async () => {
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
    <div className="page-wrap space-y-8">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Attendance</CardTitle>
              <p className="text-sm text-muted-foreground">Track daily attendance, time status, and correction requests.</p>
            </div>
            {todayData ? <Badge variant="default">Today: {todayData.todayDate}</Badge> : null}
          </div>
        </CardHeader>
      </Card>

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

