import { NextResponse } from "next/server";
import {
  removeEmployeeShiftAssignment,
  updateEmployeeShiftAssignment
} from "@emp/services/attendance.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError } from "@/lib/server/api-errors";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import {
  buildAttendanceRouteContext,
  isUnauthenticatedError,
  jsonError,
  mapAttendanceServiceErrorStatus,
  sanitizeAttendanceServiceError
} from "@/app/api/attendance/_utils";

type ShiftAssignmentBody = {
  shiftTemplateId?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/shifts/assignments/[assignmentId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { assignmentId } = await params;
    const { ctx } = await buildAttendanceRouteContext(route.ctx, ["manage_attendance", "manage_employees", "assign_shifts", "manage_shifts"]);
    const body = (await request.json()) as ShiftAssignmentBody;

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await updateEmployeeShiftAssignment(ctx, {
        assignmentId,
        shiftTemplateId: String(body.shiftTemplateId ?? ""),
        effectiveFrom: String(body.effectiveFrom ?? ""),
        effectiveTo: body.effectiveTo ?? null,
      });

      if (!result.ok) {
        return {
          status: mapAttendanceServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeAttendanceServiceError(result.error) }
        };
      }

      return { status: 200, body: { ok: true, data: result.data, requestId: route.requestId } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to update shift assignment", route.requestId));
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/shifts/assignments/[assignmentId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { assignmentId } = await params;
    const { ctx } = await buildAttendanceRouteContext(route.ctx, ["manage_attendance", "manage_employees", "assign_shifts", "manage_shifts"]);

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await removeEmployeeShiftAssignment(ctx, { assignmentId });

      if (!result.ok) {
        return {
          status: mapAttendanceServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeAttendanceServiceError(result.error) }
        };
      }

      return { status: 200, body: { ok: true, data: result.data, requestId: route.requestId } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to remove shift assignment", route.requestId));
  }
}
