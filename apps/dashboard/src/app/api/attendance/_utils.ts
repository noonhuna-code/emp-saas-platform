import { NextResponse } from "next/server";
import type { ServiceContext } from "@emp/lib/types";
import { requireServerPermission } from "@/lib/server/permissions";
import { buildServiceContext } from "@/lib/server/service-context";

export type AttendanceRouteContext = {
  ctx: ServiceContext;
};

export const buildAttendanceRouteContext = async (
  ctxOverride?: ServiceContext,
  requiredPermissions: string[] = ["manage_attendance"]
): Promise<AttendanceRouteContext> => {
  const ctx = ctxOverride ?? (await buildServiceContext());
  const hasRequiredPermission = requiredPermissions.some((permission) => ctx.permissions.includes(permission));
  if (!hasRequiredPermission) {
    requireServerPermission(requiredPermissions[0] ?? "manage_attendance", ctx);
  }
  return { ctx };
};

export const isUnauthenticatedError = (error: unknown): boolean => {
  return error instanceof Error && error.message === "Authenticated company-scoped session required";
};

export const parsePositiveInt = (
  rawValue: string | null,
  fallback: number,
  { min = 1, max = 500 }: { min?: number; max?: number } = {}
): number => {
  const parsed = Number(rawValue ?? "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

export const sanitizeAttendanceServiceError = (error?: string): string => {
  if (!error) return "Attendance operation failed";

  const knownSafe = [
    "Already clocked in for today",
    "No open attendance record",
    "No active shift assignment",
    "Shift template not found",
    "Attendance record not found",
    "Employee record not found",
    "Correction reason is required",
    "Correction not found",
    "Correction already approved",
    "Correction already rejected",
    "Rejection reason is required",
    "Requested clock-out must be later than requested clock-in",
    "Requested clock-in is outside the attendance record date",
    "Requested clock-out is outside the attendance record date"
  ];

  if (knownSafe.includes(error)) {
    return error;
  }

  if (error.startsWith("Missing permission:")) {
    return "Permission denied";
  }
  if (error === "Permission denied") {
    return "Permission denied";
  }

  return "Attendance operation failed";
};

export const mapAttendanceServiceErrorStatus = (error?: string): number => {
  if (!error) return 500;
  if (error.startsWith("Missing permission:")) return 403;
  if (error === "Permission denied") return 403;
  if (
    error === "Attendance record not found" ||
    error === "Correction not found"
    || error === "Employee record not found"
  ) {
    return 404;
  }
  if (
    error === "Correction reason is required" ||
    error === "Rejection reason is required" ||
    error.startsWith("Requested ")
  ) {
    return 400;
  }
  if (
    error === "Already clocked in for today" ||
    error === "No open attendance record" ||
    error === "No active shift assignment" ||
    error === "Correction already approved" ||
    error === "Correction already rejected"
  ) {
    return 409;
  }
  return 400;
};

export const jsonError = (error: string, status: number, requestId?: string) =>
  NextResponse.json({ ok: false, error, requestId }, { status, headers: requestId ? { "x-request-id": requestId } : {} });
