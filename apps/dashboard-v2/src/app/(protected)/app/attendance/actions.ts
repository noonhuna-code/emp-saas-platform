"use server";

import { revalidatePath } from "next/cache";
import { clockIn, clockOut, endBreak, startBreak } from "@emp/services/attendance.service";
import { clearEmployeeDashboardCache } from "@emp/services/dashboard.service";
import { buildServiceContext } from "@/lib/server/service-context";
import { clearDashboardCache } from "@/lib/server/dashboard-cache";

export type AttendanceClockActionState = {
  ok: boolean;
  error?: string;
  attendanceId?: string;
  completedAt?: number;
};

const sanitizeClockError = (error?: string): string => {
  if (!error) return "Attendance action failed";

  const knownSafe = [
    "Already clocked in for today",
    "No open attendance record",
    "Already on break",
    "No active break",
    "No active shift assignment",
    "No shift scheduled today",
    "You are on leave today",
    "You are on unpaid leave today",
    "Today is a holiday",
    "You are marked absent today",
    "Shift template not found",
    "Employee record not found"
  ];

  if (knownSafe.includes(error)) return error;
  if (error.startsWith("Missing permission:")) return "Permission denied";
  const lower = error.toLowerCase();
  if (lower.includes("row-level security policy") || lower.includes("permission denied") || lower.includes("not enough privileges")) {
    return "Permission denied";
  }
  return "Attendance action failed";
};

const buildActionResult = (
  ok: boolean,
  payload: { attendanceId?: string; error?: string }
): AttendanceClockActionState => ({
  ok,
  attendanceId: payload.attendanceId,
  error: payload.error,
  completedAt: Date.now()
});

const parseNumberOrUndefined = (value: FormDataEntryValue | null): number | undefined => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

const refreshAttendanceSurfaces = (): void => {
  clearDashboardCache("/api/dashboard/");
  clearEmployeeDashboardCache();
  revalidatePath("/app/attendance");
  revalidatePath("/app/attendance/team");
  revalidatePath("/app/dashboard");
};

export async function clockInAction(
  _prevState: AttendanceClockActionState,
  formData: FormData
): Promise<AttendanceClockActionState> {
  try {
    const employeeId = String(formData.get("employeeId") ?? "").trim();
    const source = String(formData.get("source") ?? "web").trim() || "web";
    const geoLatitude = parseNumberOrUndefined(formData.get("geoLatitude"));
    const geoLongitude = parseNumberOrUndefined(formData.get("geoLongitude"));
    const geoAccuracy = parseNumberOrUndefined(formData.get("geoAccuracy"));
    if (!employeeId) {
      return buildActionResult(false, { error: "Employee id is required" });
    }

    const ctx = await buildServiceContext();
    const result = await clockIn(ctx, employeeId, { source, geoLatitude, geoLongitude, geoAccuracy });
    if (!result.ok) {
      return buildActionResult(false, { error: sanitizeClockError(result.error) });
    }

    refreshAttendanceSurfaces();
    return buildActionResult(true, { attendanceId: result.data?.attendanceId });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Authenticated company-scoped session required"
        ? "Authentication required"
        : "Attendance action failed";

    return buildActionResult(false, { error: message });
  }
}

export async function clockOutAction(
  _prevState: AttendanceClockActionState,
  formData: FormData
): Promise<AttendanceClockActionState> {
  try {
    const employeeId = String(formData.get("employeeId") ?? "").trim();
    const source = String(formData.get("source") ?? "web").trim() || "web";
    const geoLatitude = parseNumberOrUndefined(formData.get("geoLatitude"));
    const geoLongitude = parseNumberOrUndefined(formData.get("geoLongitude"));
    const geoAccuracy = parseNumberOrUndefined(formData.get("geoAccuracy"));
    if (!employeeId) {
      return buildActionResult(false, { error: "Employee id is required" });
    }

    const ctx = await buildServiceContext();
    const result = await clockOut(ctx, employeeId, { source, geoLatitude, geoLongitude, geoAccuracy });
    if (!result.ok) {
      return buildActionResult(false, { error: sanitizeClockError(result.error) });
    }

    refreshAttendanceSurfaces();
    return buildActionResult(true, { attendanceId: result.data?.attendanceId });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Authenticated company-scoped session required"
        ? "Authentication required"
        : "Attendance action failed";

    return buildActionResult(false, { error: message });
  }
}

export async function startBreakAction(
  _prevState: AttendanceClockActionState,
  formData: FormData
): Promise<AttendanceClockActionState> {
  try {
    const employeeId = String(formData.get("employeeId") ?? "").trim();
    if (!employeeId) {
      return buildActionResult(false, { error: "Employee id is required" });
    }

    const ctx = await buildServiceContext();
    const result = await startBreak(ctx, employeeId);
    if (!result.ok) {
      return buildActionResult(false, { error: sanitizeClockError(result.error) });
    }

    refreshAttendanceSurfaces();
    return buildActionResult(true, { attendanceId: result.data?.attendanceId });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Authenticated company-scoped session required"
        ? "Authentication required"
        : "Attendance action failed";

    return buildActionResult(false, { error: message });
  }
}

export async function endBreakAction(
  _prevState: AttendanceClockActionState,
  formData: FormData
): Promise<AttendanceClockActionState> {
  try {
    const employeeId = String(formData.get("employeeId") ?? "").trim();
    if (!employeeId) {
      return buildActionResult(false, { error: "Employee id is required" });
    }

    const ctx = await buildServiceContext();
    const result = await endBreak(ctx, employeeId);
    if (!result.ok) {
      return buildActionResult(false, { error: sanitizeClockError(result.error) });
    }

    refreshAttendanceSurfaces();
    return buildActionResult(true, { attendanceId: result.data?.attendanceId });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Authenticated company-scoped session required"
        ? "Authentication required"
        : "Attendance action failed";

    return buildActionResult(false, { error: message });
  }
}

