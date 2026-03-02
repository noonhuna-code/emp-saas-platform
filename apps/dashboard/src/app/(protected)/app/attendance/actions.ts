"use server";

import { revalidatePath } from "next/cache";
import { clockIn, clockOut } from "@emp/services/attendance.service";
import { buildServiceContext } from "@/lib/server/service-context";

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
    "No active shift assignment",
    "Shift template not found"
  ];

  if (knownSafe.includes(error)) return error;
  if (error.startsWith("Missing permission:")) return "Permission denied";
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

    revalidatePath("/app/attendance");
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

    revalidatePath("/app/attendance");
    return buildActionResult(true, { attendanceId: result.data?.attendanceId });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Authenticated company-scoped session required"
        ? "Authentication required"
        : "Attendance action failed";

    return buildActionResult(false, { error: message });
  }
}
