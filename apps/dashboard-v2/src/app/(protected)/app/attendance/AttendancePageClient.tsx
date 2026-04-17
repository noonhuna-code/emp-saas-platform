"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AttendanceClockActionState } from "./actions";
import { createAttendanceCorrectionRequest, fetchAttendanceToday, peekCachedResult } from "@/lib/client/api";
import type { AttendanceHistoryRow, AttendanceTodayResponse } from "@/lib/types/attendance";
import { TodayAttendanceCard } from "@/components/attendance/TodayAttendanceCard";
import { ClockActions } from "@/components/attendance/ClockActions";
import { AttendanceHistoryTable } from "@/components/attendance/AttendanceHistoryTable";
import { CorrectionRequestDialog } from "@/components/attendance/CorrectionRequestDialog";
import { ErrorState } from "@/components/states/ErrorState";
import { EmployeeWorkspaceSetupState, isEmployeeWorkspaceSetupIssue } from "@/components/states/EmployeeWorkspaceSetupState";
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

const computeLiveWorkedMinutes = (checkIn: string | null | undefined, checkOut: string | null | undefined): number | null => {
  if (!checkIn || checkOut) return null;
  const startedAt = new Date(checkIn);
  if (Number.isNaN(startedAt.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 60000));
};

const computeShiftMinutes = (startTime: string | null | undefined, endTime: string | null | undefined): number | null => {
  if (!startTime || !endTime) return null;
  const startParts = startTime.split(":");
  const endParts = endTime.split(":");
  if (startParts.length < 2 || endParts.length < 2) return null;
  const startHourPart = startParts[0];
  const startMinutePart = startParts[1];
  const endHourPart = endParts[0];
  const endMinutePart = endParts[1];
  if (!startHourPart || !startMinutePart || !endHourPart || !endMinutePart) return null;
  const startHour = Number(startHourPart);
  const startMinute = Number(startMinutePart);
  const endHour = Number(endHourPart);
  const endMinute = Number(endMinutePart);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return null;
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end < start) end += 24 * 60;
  return Math.max(0, end - start);
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

const prettyDayState = (state: AttendanceTodayResponse["dayState"]): string => {
  switch (state) {
    case "go_active":
      return "GO Active";
    case "go_applied":
      return "GO Applied";
    case "leave_unpaid":
      return "Unpaid leave";
    case "leave_paid":
      return "Paid leave";
    case "off_day":
      return "Off day";
    default:
      return state.replace(/_/g, " ");
  }
};

const dayStateHint = (data: AttendanceTodayResponse): string => {
  switch (data.dayState) {
    case "off_day":
      return "No roster workday and no deduction by default.";
    case "leave_paid":
      return `You are on ${data.leaveContext?.leave_type_name ?? "approved leave"} today.`;
    case "leave_unpaid":
      return `You are on ${data.leaveContext?.leave_type_name ?? "unpaid leave"} today.`;
    case "go_active":
      return `${data.holidayContext?.holiday_name ?? "Holiday"} worked and treated as extra payable time.`;
    case "go_applied":
      return `${data.holidayContext?.holiday_name ?? "Holiday"} is being treated as compensated GO benefit.`;
    case "absent":
      return "This day is marked absent from explicit attendance truth.";
    case "present":
      return data.currentStatus === "not_clocked_in"
        ? "A shift is scheduled today and you can clock in when ready."
        : "Live attendance and payroll-impact state for today.";
    case "late":
      return "Late Login Today. Attendance remains late unless the attendance-exception request is approved.";
    default:
      return "Live attendance and payroll-impact state for today.";
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
  const [lateLoginBusy, setLateLoginBusy] = useState(false);
  const [lateLoginMessage, setLateLoginMessage] = useState<string | null>(null);

  const loadToday = useCallback(async () => {
    setTodayError(null);
    setLateLoginMessage(null);
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
    if (["off_day", "leave_paid", "leave_unpaid", "go_applied", "absent"].includes(todayData.dayState)) {
      return { canClockIn: false, canClockOut: false, canStartBreak: false, canEndBreak: false };
    }
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
    const workedMinutes = record?.work_minutes ?? computeLiveWorkedMinutes(record?.check_in, record?.check_out);
    const shiftMinutes = computeShiftMinutes(todayData?.shiftContext.start_time, todayData?.shiftContext.end_time);
    const remainingShiftMinutes =
      typeof shiftMinutes === "number" && typeof workedMinutes === "number" && shiftMinutes > workedMinutes
        ? shiftMinutes - workedMinutes
        : 0;
    return [
      {
        label: "Day state",
        value: prettyDayState(todayData?.dayState ?? "present"),
        hint: record?.is_locked ? "Record locked for edits" : todayData ? dayStateHint(todayData) : "Live shift state",
      },
      {
        label: "Worked today",
        value: formatMinutes(workedMinutes),
        hint:
          remainingShiftMinutes > 0
            ? `Remaining in shift ${formatMinutes(remainingShiftMinutes)}`
            : `Overtime ${formatMinutes(record?.overtime_minutes)}`,
      },
      {
        label: "Shift start",
        value: todayData?.shiftContext.start_time ?? record?.shift_start_time ?? "-",
        hint: todayData?.shiftContext.end_time ? `Ends ${todayData.shiftContext.end_time}` : "No shift assigned",
      },
      {
        label: "Clock status",
        value: prettyCurrentStatus(todayData?.currentStatus ?? "not_clocked_in"),
        hint: todayData?.isOnBreak ? "Resume from the clock actions rail" : "Use attendance controls when the day is active",
      },
      {
        label: "Payroll impact",
        value: (todayData?.payrollImpact ?? "normal_pay").replace(/_/g, " "),
        hint: geo ? `Geo captured ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}` : "Geo not captured yet",
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

  const handleLateLoginRequest = useCallback(async () => {
    if (!todayData?.record?.id || todayData.dayState !== "late") return;
    setLateLoginBusy(true);
    setTodayError(null);
    setLateLoginMessage(null);
    try {
      const result = await createAttendanceCorrectionRequest({
        attendanceId: todayData.record.id,
        reason: "Late Login",
        note: "Late Login",
      });
      if (!result.ok) {
        if (result.error === "Late Login request already exists for this day") {
          setLateLoginMessage("Late Login request already exists for today.");
          setRefreshKey((value) => value + 1);
          return;
        }
        setTodayError(result.error ?? "Unable to submit Late Login request");
        return;
      }
      setLateLoginMessage("Late Login request submitted.");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit Late Login request";
      if (message === "Late Login request already exists for this day") {
        setLateLoginMessage("Late Login request already exists for today.");
        setRefreshKey((value) => value + 1);
        return;
      }
      setTodayError(message);
    } finally {
      setLateLoginBusy(false);
    }
  }, [todayData]);

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
            {todayData.dayState === "late" ? (
              todayData.lateLoginRequest.exists ? (
                <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-700">
                  Late Login {todayData.lateLoginRequest.status ?? "pending"}
                </Badge>
              ) : (
                <Button
                  variant="secondary"
                  className="rounded-full"
                  disabled={lateLoginBusy || !todayData.record?.id}
                  onClick={() => void handleLateLoginRequest()}
                >
                  {lateLoginBusy ? "Submitting..." : "Request Late Login"}
                </Button>
              )
            ) : null}
            <Button variant="secondary" className="rounded-full" onClick={() => setCorrectionDialogOpen(true)}>
              Request correction
            </Button>
          </>
        ) : undefined}
      />

      {loadingToday ? <LoadingState label="Loading attendance command center" /> : null}
      {!loadingToday && todayError && !todayData ? (
        isEmployeeWorkspaceSetupIssue(todayError) ? (
          <EmployeeWorkspaceSetupState
            title="Attendance access is not ready yet"
            description="This route needs a linked employee attendance record or self-service attendance scope before today’s attendance data can render."
          />
        ) : (
          <ErrorState message={todayError} />
        )
      ) : null}

      {!loadingToday && todayData ? (
        <>
          {todayError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
              {todayError}
            </div>
          ) : null}
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
              {todayData.dayState === "late" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
                  <p className="font-medium">Late Login Today</p>
                  <p className="mt-1">
                    {todayData.lateLoginRequest.exists
                      ? `Request status: ${todayData.lateLoginRequest.status ?? "pending"}`
                      : "You can submit one attendance-exception request for this late clock-in."}
                  </p>
                  {lateLoginMessage ? <p className="mt-2 text-emerald-700">{lateLoginMessage}</p> : null}
                </div>
              ) : null}
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

