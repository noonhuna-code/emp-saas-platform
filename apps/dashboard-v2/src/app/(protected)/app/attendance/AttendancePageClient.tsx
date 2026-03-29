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
import {
  DashboardRail,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ClockActionFn = (
  prevState: AttendanceClockActionState,
  formData: FormData,
) => Promise<AttendanceClockActionState>;

const formatMinutes = (value: number | null | undefined): string => {
  if (typeof value !== "number") return "-";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours}h ${minutes}m`;
};

const prettyCurrentStatus = (status: AttendanceTodayResponse["currentStatus"]): string => {
  switch (status) {
    case "clocked_in":
      return "Clocked in";
    case "clocked_out":
      return "Clocked out";
    case "on_break":
      return "On break";
    case "not_clocked_in":
    default:
      return "Not clocked in";
  }
};

export const AttendancePageClient = ({
  clockInAction,
  clockOutAction,
  startBreakAction,
  endBreakAction,
}: {
  clockInAction: ClockActionFn;
  clockOutAction: ClockActionFn;
  startBreakAction: ClockActionFn;
  endBreakAction: ClockActionFn;
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
    if (!todayData) return { canClockIn: false, canClockOut: false, canStartBreak: false, canEndBreak: false };
    const locked = todayData.record?.is_locked ?? false;
    if (locked) return { canClockIn: false, canClockOut: false, canStartBreak: false, canEndBreak: false };
    switch (todayData.currentStatus) {
      case "not_clocked_in":
        return { canClockIn: true, canClockOut: false, canStartBreak: false, canEndBreak: false };
      case "clocked_in":
        return { canClockIn: false, canClockOut: true, canStartBreak: true, canEndBreak: false };
      case "on_break":
        return { canClockIn: false, canClockOut: true, canStartBreak: false, canEndBreak: true };
      case "clocked_out":
      default:
        return { canClockIn: false, canClockOut: false, canStartBreak: false, canEndBreak: false };
    }
  }, [todayData]);

  const overview = useMemo(() => {
    const record = todayData?.record;
    const geo = todayData?.latestGeoEvent;
    return [
      {
        label: "Attendance status",
        value: prettyCurrentStatus(todayData?.currentStatus ?? "not_clocked_in"),
        hint: record?.is_locked ? "Record locked for edits" : "Live shift state",
      },
      {
        label: "Worked today",
        value: formatMinutes(record?.work_minutes),
        hint: `Overtime ${formatMinutes(record?.overtime_minutes)}`,
      },
      {
        label: "Shift start",
        value: record?.shift_start_time ?? "-",
        hint: record?.shift_end_time ? `Ends ${record.shift_end_time}` : "No shift assigned",
      },
      {
        label: "Break status",
        value: todayData?.isOnBreak ? "On break" : record?.check_in && !record?.check_out ? "Available" : "Inactive",
        hint: todayData?.isOnBreak ? "Resume from the clock actions rail" : "Start a break after you clock in",
      },
      {
        label: "Geo capture",
        value: geo ? `${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}` : "Pending",
        hint: geo ? "Latest coordinates captured" : "Capture before clocking",
      },
    ];
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
    <PageContainer>
      <PageHeader
        eyebrow="Attendance"
        title="Attendance workspace"
        description="Track clock events, geo verification, and correction requests from one focused workspace."
        actions={todayData ? (
          <>
            <Badge className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
              Today {todayData.todayDate}
            </Badge>
            <Button variant="secondary" className="rounded-full" onClick={() => setCorrectionDialogOpen(true)}>
              Request correction
            </Button>
          </>
        ) : undefined}
      />

      {loadingToday ? <LoadingState label="Loading attendance command center" /> : null}
      {!loadingToday && todayError ? <ErrorState message={todayError} /> : null}

      {!loadingToday && !todayError && todayData ? (
        <>
          <StatGrid>
            {overview.map((item) => (
              <StatCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
            ))}
          </StatGrid>

          <DashboardRail>
            <TodayAttendanceCard data={todayData} />
            <SurfacePanel
              title="Clock actions"
              description="Use the existing employee attendance mutation flow without leaving this route."
            >
              <ClockActions
                employeeId={todayData.employeeId}
                locked={todayData.record?.is_locked ?? false}
                canClockIn={actionDisabledState.canClockIn}
                canClockOut={actionDisabledState.canClockOut}
                canStartBreak={actionDisabledState.canStartBreak}
                canEndBreak={actionDisabledState.canEndBreak}
                clockInAction={clockInAction}
                clockOutAction={clockOutAction}
                startBreakAction={startBreakAction}
                endBreakAction={endBreakAction}
                onCompleted={handleClockActionComplete}
              />
            </SurfacePanel>
          </DashboardRail>

          <SurfacePanel
            title="Attendance history"
            description="Filter and review recorded attendance entries. Use correction requests where needed."
          >
            <AttendanceHistoryTable refreshKey={refreshKey} onRequestCorrection={handleRequestCorrection} />
          </SurfacePanel>

          <CorrectionRequestDialog
            open={correctionDialogOpen}
            record={selectedRecord}
            onClose={() => setCorrectionDialogOpen(false)}
            onSubmitted={handleCorrectionSubmitted}
          />
        </>
      ) : null}
    </PageContainer>
  );
};

