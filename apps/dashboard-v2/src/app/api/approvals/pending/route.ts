import { NextResponse } from "next/server";
import { listPendingLeaveRequests, type LeaveRequestItem } from "@emp/services/leave.service";
import { listPendingAttendanceCorrections, type AttendanceCorrectionReviewRow } from "@emp/services/attendance.service";
import { requirePlanFeature } from "@emp/lib/entitlements";
import { handleRouteError, jsonError, sanitizeServiceError, mapServiceErrorStatus } from "@/lib/server/api-errors";
import type { UnifiedApprovalItem } from "@/lib/types/approvals";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";

export async function GET() {
  const route = await beginRoute();
  const endpoint = "/api/approvals/pending";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const ctx = route.ctx;
    await requirePlanFeature(ctx, "feature.unified_approvals_workspace");

    const canLeave = ctx.permissions.includes("manage_employees") || ctx.permissions.includes("manage_attendance");
    const canAttendance = ctx.permissions.includes("manage_attendance");

    if (!canLeave && !canAttendance) {
      return finalizeRoute(route, endpoint, jsonError("Permission denied", 403, route.requestId));
    }

    const items: UnifiedApprovalItem[] = [];

    if (canLeave) {
      const leaveResult = await listPendingLeaveRequests(ctx, { limit: 100 });
      if (!leaveResult.ok) {
        return finalizeRoute(
          route,
          endpoint,
          jsonError(
            sanitizeServiceError(leaveResult.error, "Unable to load leave approvals"),
            mapServiceErrorStatus(leaveResult.error),
            route.requestId
          )
        );
      }

      (leaveResult.data?.requests ?? []).forEach((req: LeaveRequestItem) => {
        items.push({
          type: "leave",
          source: "leave",
          id: req.id,
          employee_id: req.employee_id,
          employee_name: req.employee_name ?? null,
          submitted_at: req.created_at,
          status: req.status,
          summary: `${req.leave_type_name ?? req.leave_type_id} ${req.start_date} -> ${req.end_date}`
        });
      });
    }

    if (canAttendance) {
      const attendanceResult = await listPendingAttendanceCorrections(ctx, { limit: 100 });
      if (!attendanceResult.ok) {
        return finalizeRoute(
          route,
          endpoint,
          jsonError(
            sanitizeServiceError(attendanceResult.error, "Unable to load attendance approvals"),
            mapServiceErrorStatus(attendanceResult.error),
            route.requestId
          )
        );
      }

      (attendanceResult.data?.rows ?? []).forEach((row: AttendanceCorrectionReviewRow) => {
        const attendanceDate = row.attendance?.attendance_date ?? "";
        items.push({
          type: "attendance",
          source: "attendance",
          id: row.id,
          employee_id: row.attendance?.employee_id ?? row.employee?.id ?? "",
          employee_name: row.employee?.full_name ?? null,
          submitted_at: row.created_at ?? "",
          status: row.status,
          summary: `Correction ${attendanceDate}`.trim()
        });
      });
    }

    items.sort((a, b) => {
      const aTime = new Date(a.submitted_at).getTime();
      const bTime = new Date(b.submitted_at).getTime();
      return aTime - bTime;
    });

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: { items } }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load approvals", route.requestId));
  }
}
